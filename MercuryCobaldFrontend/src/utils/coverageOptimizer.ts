/**
 * Coverage-maximizing search over plane RAAN/phase, altitude and inclination
 * held fixed.
 *
 * Engineering note on the parameterization: the scenario's horizon is a full
 * day, and satellites orbit far faster than Earth rotates under them, so
 * rotating every plane's RAAN by the same rigid offset barely changes the
 * set of relative geometries realised over a full day — it only relabels
 * which moment in the daily cycle is "t=0". What actually changes coverage is
 * the RAAN *spacing between planes* and the phase *stagger between planes* —
 * the two degrees of freedom of a classic Walker-delta pattern. So both
 * search dimensions here are inter-plane spacings, not whole-constellation
 * rotations: `raan_i = raan_0 + i * raanSpacingDeg`, `phase_i = phase_0 + i *
 * phaseSpacingDeg`, indexed by each plane's position in the scenario.
 *
 * Search is two-staged to stay responsive in a browser tab with no worker:
 *   1. Screen every (raanSpacing, phaseSpacing) grid point using visibility
 *      only (no routing) on a decimated time grid — cheap.
 *   2. Re-evaluate the top-K screened candidates with full routing on the
 *      full time grid, and rank by the *worst* per-client availability (not
 *      the mean) — that is the scenario's own acceptance criterion ("не менее
 *      90% для каждого наземного пункта").
 * The loop yields to the event loop periodically so the tab stays responsive
 * while a search runs.
 */
import type { CoverageCandidate, GroundSite, Plane, Scenario } from "../domain";
import { computeSnapshot, timeGrid } from "./geometry";
import { computeRoute } from "./routing";
import { generateId } from "./id";

export interface CoverageSearchOptions {
  planeIds?: string[];
  raanStepDeg?: number;
  phaseStepDeg?: number;
  /** Evaluate every Nth step of the full grid during the cheap screening stage. */
  cheapStride?: number;
  /** How many screened candidates get the full, accurate re-evaluation. */
  refineTopK?: number;
  /** How many final ranked candidates to return. */
  resultCount?: number;
}

const DEFAULTS: Required<CoverageSearchOptions> = {
  planeIds: [],
  raanStepDeg: 24,
  phaseStepDeg: 24,
  cheapStride: 12,
  refineTopK: 5,
  resultCount: 5,
};

function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

function buildCandidatePlanes(
  planes: Plane[],
  planeIds: string[],
  raanSpacingDeg: number,
  phaseSpacingDeg: number,
): Plane[] {
  const targeted = planes.filter((p) => planeIds.includes(p.id));
  const raan0 = targeted[0]?.raan_deg ?? 0;
  const phase0 = targeted[0]?.phase_deg ?? 0;
  let i = 0;
  return planes.map((p) => {
    if (!planeIds.includes(p.id)) return p;
    const idx = i++;
    return {
      ...p,
      raan_deg: normalizeDeg(raan0 + idx * raanSpacingDeg),
      phase_deg: normalizeDeg(phase0 + idx * phaseSpacingDeg),
    };
  });
}

function buildCandidateScenario(
  baseline: Scenario,
  planeIds: string[],
  raanSpacingDeg: number,
  phaseSpacingDeg: number,
): Scenario {
  return {
    ...baseline,
    design: {
      ...baseline.design,
      planes: buildCandidatePlanes(baseline.design.planes, planeIds, raanSpacingDeg, phaseSpacingDeg),
    },
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function searchCoverageConfigurations(
  baseline: Scenario,
  options: CoverageSearchOptions = {},
): Promise<CoverageCandidate[]> {
  const opts = { ...DEFAULTS, ...options };
  const planeIds = opts.planeIds.length > 0 ? opts.planeIds : baseline.design.planes.map((p) => p.id);
  const clients: GroundSite[] = baseline.ground_sites.filter((s) => s.role === "client");
  if (clients.length === 0 || planeIds.length === 0) return [];

  const fullGrid = timeGrid(baseline.environment);
  const decimatedGrid = fullGrid.filter((_, i) => i % opts.cheapStride === 0);

  interface Screened {
    raanSpacing: number;
    phaseSpacing: number;
    worstVisibility: number;
    meanVisibility: number;
  }
  const screened: Screened[] = [];

  let evaluated = 0;
  for (let raanSpacing = 0; raanSpacing < 360; raanSpacing += opts.raanStepDeg) {
    for (let phaseSpacing = 0; phaseSpacing < 360; phaseSpacing += opts.phaseStepDeg) {
      const candidate = buildCandidateScenario(baseline, planeIds, raanSpacing, phaseSpacing);
      const visibleCounts = new Map(clients.map((c) => [c.id, 0]));
      for (const t of decimatedGrid) {
        const snap = computeSnapshot(candidate, t);
        for (const client of clients) {
          if ((snap.elevation_deg[client.id] ?? []).some((e) => e.visible)) {
            visibleCounts.set(client.id, (visibleCounts.get(client.id) ?? 0) + 1);
          }
        }
      }
      let worst = Infinity;
      let sum = 0;
      for (const client of clients) {
        const frac = decimatedGrid.length > 0 ? (visibleCounts.get(client.id) ?? 0) / decimatedGrid.length : 0;
        worst = Math.min(worst, frac);
        sum += frac;
      }
      screened.push({ raanSpacing, phaseSpacing, worstVisibility: worst, meanVisibility: sum / clients.length });

      evaluated++;
      if (evaluated % 20 === 0) await yieldToEventLoop();
    }
  }

  screened.sort((a, b) => b.worstVisibility - a.worstVisibility || b.meanVisibility - a.meanVisibility);
  const shortlist = screened.slice(0, opts.refineTopK);

  // The cheap screen ranks by geometric visibility, but the real objective is
  // end-to-end routed availability, and the two are not perfectly correlated
  // (a spacing with great overhead visibility can still route worse if the
  // ISL mesh it produces is less favourable). That means the visibility
  // funnel can, in principle, discard the spacing the user already has even
  // when it is in fact the best one. To guarantee the search never proposes
  // something strictly worse than the current configuration without at least
  // comparing against it, the baseline's own inter-plane spacing is always
  // added to the refinement set (deduplicated against the screened shortlist).
  const targetedBaselinePlanes = baseline.design.planes.filter((p) => planeIds.includes(p.id));
  const baselineRaanSpacing =
    targetedBaselinePlanes.length >= 2
      ? normalizeDeg(targetedBaselinePlanes[1]!.raan_deg - targetedBaselinePlanes[0]!.raan_deg)
      : 0;
  const baselinePhaseSpacing =
    targetedBaselinePlanes.length >= 2
      ? normalizeDeg(targetedBaselinePlanes[1]!.phase_deg - targetedBaselinePlanes[0]!.phase_deg)
      : 0;
  const alreadyShortlisted = shortlist.some(
    (s) => Math.abs(s.raanSpacing - baselineRaanSpacing) < 0.01 && Math.abs(s.phaseSpacing - baselinePhaseSpacing) < 0.01,
  );
  const toRefine = alreadyShortlisted
    ? shortlist
    : [...shortlist, { raanSpacing: baselineRaanSpacing, phaseSpacing: baselinePhaseSpacing, worstVisibility: 0, meanVisibility: 0 }];

  const refined: CoverageCandidate[] = [];
  for (const s of toRefine) {
    const candidate = buildCandidateScenario(baseline, planeIds, s.raanSpacing, s.phaseSpacing);
    const perClientAvailability: Record<string, number> = {};
    let worst = Infinity;
    let sum = 0;
    // Availability is the primary ranking criterion (worst-case per the scenario's own
    // acceptance rule); max outage duration is tracked too so it can be shown as an
    // auxiliary, non-decisive figure alongside it — the two are surfaced separately
    // rather than folded into one score, per the same principle used in "Сравнение".
    let worstMaxOutageSteps = 0;
    for (const client of clients) {
      let connectedCount = 0;
      let currentOutageSteps = 0;
      let longestOutageSteps = 0;
      for (const t of fullGrid) {
        const snap = computeSnapshot(candidate, t);
        const route = computeRoute(candidate, snap, client);
        if (route.path.length > 0) {
          connectedCount++;
          currentOutageSteps = 0;
        } else {
          currentOutageSteps++;
          longestOutageSteps = Math.max(longestOutageSteps, currentOutageSteps);
        }
      }
      const frac = fullGrid.length > 0 ? connectedCount / fullGrid.length : 0;
      perClientAvailability[client.id] = frac;
      worst = Math.min(worst, frac);
      sum += frac;
      worstMaxOutageSteps = Math.max(worstMaxOutageSteps, longestOutageSteps);
    }
    refined.push({
      id: generateId("coverage"),
      raan_spacing_deg: s.raanSpacing,
      phase_spacing_deg: s.phaseSpacing,
      planes: candidate.design.planes
        .filter((p) => planeIds.includes(p.id))
        .map((p) => ({ plane_id: p.id, raan_deg: p.raan_deg, phase_deg: p.phase_deg })),
      worst_visibility_fraction: s.worstVisibility,
      mean_visibility_fraction: s.meanVisibility,
      worst_availability_fraction: worst,
      mean_availability_fraction: sum / clients.length,
      per_client_availability_fraction: perClientAvailability,
      worst_max_outage_s: worstMaxOutageSteps * baseline.environment.step_s,
    });
    await yieldToEventLoop();
  }

  refined.sort(
    (a, b) => b.worst_availability_fraction - a.worst_availability_fraction || b.mean_availability_fraction - a.mean_availability_fraction,
  );
  return refined.slice(0, opts.resultCount);
}
