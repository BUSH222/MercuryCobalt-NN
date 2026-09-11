/**
 * Per-instant, per-client link-quality sample. Built on top of `Route` (pure
 * topology) by `utils/linkMetrics.ts` — this layer never touches routing, it
 * only derives physics (distance -> latency), link quality (elevation, FSPL)
 * and robustness (handover headroom) from an already-computed route.
 */

export type LinkStatus = "healthy" | "degraded" | "outage";

export interface SubPoint {
  lat_deg: number;
  lon_deg: number;
}

export interface ClientLinkSample {
  t_s: number;
  client_id: string;

  // Connectivity & path shape
  connected: boolean;
  gateway_id: string | null;
  path: string[];
  hop_count: number | null;
  relay_satellite_count: number | null;
  uses_isl: boolean;
  first_hop_satellite: string | null;
  last_hop_satellite: string | null;

  // Distance -> latency (pure speed-of-light physics)
  total_distance_km: number | null;
  one_way_latency_ms: number | null;
  round_trip_latency_ms: number | null;
  /** Configurable per-hop switching delay, one-way total across all hops. */
  processing_delay_ms: number | null;
  total_rtt_ms: number | null;

  // Per-hop link quality
  max_hop_km: number | null;
  min_hop_km: number | null;
  avg_hop_km: number | null;
  first_hop_elevation_deg: number | null;
  last_hop_elevation_deg: number | null;
  /** Free-space path loss on the longest (bottleneck) hop; depends on the assumed frequency. */
  fspl_db_bottleneck: number | null;

  // Robustness
  visible_satellite_count: number;
  /** Cheap proxy for alt-disjoint-path count (visible_satellite_count - 1); no max-flow run client-side. */
  alt_disjoint_paths_estimate: number;

  // Frontend-friendly derived fields
  elevation_margin_deg: number | null;
  status: LinkStatus;
  serving_satellite_subpoint: SubPoint | null;
  /** Filled in a second pass over the series once all instants are known. */
  time_since_last_handover_s: number | null;
}

/** Assumptions behind RTT/FSPL/status derivation — display-tunable, not part of the scenario schema. */
export interface LinkAssumptions {
  frequency_ghz: number;
  per_hop_processing_delay_ms: number;
  degraded_elevation_margin_deg: number;
  degraded_rtt_ms: number;
}

export const DEFAULT_LINK_ASSUMPTIONS: LinkAssumptions = {
  frequency_ghz: 20,
  per_hop_processing_delay_ms: 5,
  degraded_elevation_margin_deg: 5,
  degraded_rtt_ms: 60,
};
