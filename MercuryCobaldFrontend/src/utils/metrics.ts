/**
 * Aggregate per-client availability metrics from a computed series, per
 * "Показатели результата" in "Описание данных": visibility fraction,
 * availability fraction, and the longest outage run (with start/end runs
 * flagged separately since they may be truncated by the computation window).
 */
import type { ClientAvailabilityMetrics, Environment, OutageRun, Route } from "../domain";

export function computeClientMetrics(
  clientId: string,
  routes: Route[],
  visibilityFlags: boolean[],
  env: Environment,
): ClientAvailabilityMetrics {
  const total = routes.length;
  const visibleCount = visibilityFlags.filter(Boolean).length;
  const availableCount = routes.filter((r) => r.path.length > 0).length;

  const outageRuns: OutageRun[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < total; i++) {
    const hasRoute = routes[i]!.path.length > 0;
    if (!hasRoute && runStart === null) runStart = i;
    if (hasRoute && runStart !== null) {
      outageRuns.push(buildRun(runStart, i - 1, total, env));
      runStart = null;
    }
  }
  if (runStart !== null) outageRuns.push(buildRun(runStart, total - 1, total, env));

  const maxOutageS = outageRuns.reduce((max, r) => Math.max(max, r.duration_s), 0);

  const hopCounts = routes
    .map((r) => r.hop_count)
    .filter((h): h is number => h !== null);

  return {
    client_id: clientId,
    visibility_fraction: total > 0 ? visibleCount / total : 0,
    availability_fraction: total > 0 ? availableCount / total : 0,
    max_outage_s: maxOutageS,
    outage_runs: outageRuns,
    min_hop_count: hopCounts.length > 0 ? Math.min(...hopCounts) : null,
    max_hop_count: hopCounts.length > 0 ? Math.max(...hopCounts) : null,
  };
}

function buildRun(startIdx: number, endIdx: number, total: number, env: Environment): OutageRun {
  return {
    start_index: startIdx,
    end_index: endIdx,
    duration_s: (endIdx - startIdx + 1) * env.step_s,
    at_start: startIdx === 0,
    at_end: endIdx === total - 1,
  };
}
