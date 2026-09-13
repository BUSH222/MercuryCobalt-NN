/**
 * Per-edge "safety margin" formulas for the widest-path strategy
 * (`widestPathByMargin.ts`): how much slack a link has before it would drop,
 * normalised to a roughly 0..1 fraction of its own budget so a ground leg
 * (measured in degrees of elevation) and an ISL leg (measured in km of
 * range) are comparable within the same path's bottleneck. 0 means right at
 * the visibility/range threshold; larger is safer.
 */
import type { Scenario, Snapshot } from "../../domain";

/**
 * Fraction of the elevation range above `min_elevation_deg` still in
 * reserve, up to zenith. Can go negative in advanced (terrain) mode: a link
 * can be `visible` there despite `elevation_deg < min_elevation_deg`, since
 * the horizon profile overrides the plain threshold — a negative margin is
 * then a real, if rough, signal that this link would have failed the basic
 * model's check, not a bug.
 */
export function groundLegMargin(elevationDeg: number, minElevationDeg: number): number {
  const span = Math.max(90 - minElevationDeg, 1e-6);
  return (elevationDeg - minElevationDeg) / span;
}

/** Fraction of `isl_range_km` still in reserve before this link would exceed range. */
export function islLegMargin(distanceKm: number, islRangeKm: number): number {
  return (islRangeKm - distanceKm) / Math.max(islRangeKm, 1e-6);
}

/**
 * The bottleneck margin of an already-built path: the weakest of its own
 * legs, by the same formulas the search itself optimises for. Used to show
 * "устойчивость" for a route regardless of which algorithm produced it (the
 * comparison table in the Route panel calls this for every algorithm's
 * candidate path, not just the widest-margin one). Returns `null` if the
 * path is too short to have a leg, or if a leg's underlying elevation/edge
 * data can't be found (should not happen for a path this module itself just
 * built, but a defensive contract for callers passing in an arbitrary path).
 */
export function pathBottleneckMargin(scenario: Scenario, snapshot: Snapshot, path: string[]): number | null {
  if (path.length < 3) return null;
  const { min_elevation_deg: minElevationDeg, isl_range_km: islRangeKm } = scenario.environment;
  let worst = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const isGroundLeg = i === 0 || i === path.length - 2;
    if (isGroundLeg) {
      const [siteId, satId] = i === 0 ? [a, b] : [b, a];
      const elevationDeg = (snapshot.elevation_deg[siteId] ?? []).find((e) => e.satellite_id === satId)?.elevation_deg;
      if (elevationDeg === undefined) return null;
      worst = Math.min(worst, groundLegMargin(elevationDeg, minElevationDeg));
    } else {
      const edge = snapshot.edges.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
      if (!edge) return null;
      worst = Math.min(worst, islLegMargin(edge[2], islRangeKm));
    }
  }
  return worst;
}
