import type { ClientLinkSample, ConstellationStepStats, Snapshot } from "../domain";

/** Aggregated once per instant across every client's sample at that instant. */
export function computeConstellationStepStats(snapshot: Snapshot, samplesAtT: ClientLinkSample[]): ConstellationStepStats {
  const satelliteLoad: Record<string, number> = {};
  for (const sample of samplesAtT) {
    if (sample.first_hop_satellite) {
      satelliteLoad[sample.first_hop_satellite] = (satelliteLoad[sample.first_hop_satellite] ?? 0) + 1;
    }
    if (sample.last_hop_satellite && sample.last_hop_satellite !== sample.first_hop_satellite) {
      satelliteLoad[sample.last_hop_satellite] = (satelliteLoad[sample.last_hop_satellite] ?? 0) + 1;
    }
  }
  const meanVisible =
    samplesAtT.length > 0
      ? samplesAtT.reduce((sum, s) => sum + s.visible_satellite_count, 0) / samplesAtT.length
      : 0;
  return { t_s: snapshot.t_s, satellite_load: satelliteLoad, mean_visible_satellites: meanVisible };
}
