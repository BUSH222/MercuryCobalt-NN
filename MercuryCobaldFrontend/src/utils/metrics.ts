/**
 * Aggregate per-client availability + link-quality roll-ups from a computed
 * series of link samples, per "Показатели результата" in "Описание данных"
 * plus the RTT/jitter/handover/downtime extensions: visibility fraction,
 * availability fraction, the longest outage run (with start/end runs flagged
 * separately since they may be truncated by the computation window), mean/p95
 * RTT, jitter, handover count and total downtime.
 */
import type { ClientAvailabilityMetrics, ClientLinkSample, Environment, OutageRun } from "../domain";

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx]!;
}

export function computeClientMetrics(
  clientId: string,
  samples: ClientLinkSample[],
  env: Environment,
): ClientAvailabilityMetrics {
  const total = samples.length;
  const visibleCount = samples.filter((s) => s.visible_satellite_count > 0).length;
  const availableCount = samples.filter((s) => s.connected).length;

  const outageRuns: OutageRun[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < total; i++) {
    const hasRoute = samples[i]!.connected;
    if (!hasRoute && runStart === null) runStart = i;
    if (hasRoute && runStart !== null) {
      outageRuns.push(buildRun(runStart, i - 1, total, env));
      runStart = null;
    }
  }
  if (runStart !== null) outageRuns.push(buildRun(runStart, total - 1, total, env));

  const maxOutageS = outageRuns.reduce((max, r) => Math.max(max, r.duration_s), 0);
  const totalDowntimeS = outageRuns.reduce((sum, r) => sum + r.duration_s, 0);

  const hopCounts = samples.map((s) => s.hop_count).filter((h): h is number => h !== null);

  const rttValues = samples.map((s) => s.total_rtt_ms).filter((v): v is number => v !== null);
  const meanRttMs = rttValues.length > 0 ? rttValues.reduce((a, b) => a + b, 0) / rttValues.length : null;
  const p95RttMs = rttValues.length > 0 ? percentile(rttValues, 0.95) : null;

  let jitterSum = 0;
  let jitterCount = 0;
  for (let i = 1; i < total; i++) {
    const prev = samples[i - 1]!;
    const cur = samples[i]!;
    if (prev.connected && cur.connected && prev.total_rtt_ms !== null && cur.total_rtt_ms !== null) {
      jitterSum += Math.abs(cur.total_rtt_ms - prev.total_rtt_ms);
      jitterCount++;
    }
  }
  const jitterMs = jitterCount > 0 ? jitterSum / jitterCount : null;

  let handoverCount = 0;
  for (let i = 1; i < total; i++) {
    const prev = samples[i - 1]!;
    const cur = samples[i]!;
    if (prev.connected && cur.connected && prev.first_hop_satellite !== cur.first_hop_satellite) handoverCount++;
  }

  const availabilityFraction = total > 0 ? availableCount / total : 0;

  return {
    client_id: clientId,
    visibility_fraction: total > 0 ? visibleCount / total : 0,
    availability_fraction: availabilityFraction,
    meets_target_availability: availabilityFraction >= env.target_availability,
    max_outage_s: maxOutageS,
    total_downtime_s: totalDowntimeS,
    outage_runs: outageRuns,
    outage_count: outageRuns.length,
    min_hop_count: hopCounts.length > 0 ? Math.min(...hopCounts) : null,
    max_hop_count: hopCounts.length > 0 ? Math.max(...hopCounts) : null,
    mean_rtt_ms: meanRttMs,
    p95_rtt_ms: p95RttMs,
    jitter_ms: jitterMs,
    handover_count: handoverCount,
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
