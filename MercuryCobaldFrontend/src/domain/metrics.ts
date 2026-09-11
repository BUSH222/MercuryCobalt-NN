/**
 * Aggregate availability metrics per ground site over the full computation
 * horizon, per "Показатели результата" in "Описание данных", extended with
 * link-quality roll-ups (RTT, jitter, handovers, total downtime) derived from
 * the per-instant `ClientLinkSample` series.
 */

export interface OutageRun {
  start_index: number;
  end_index: number;
  duration_s: number;
  /** Touches the first computed instant; may continue before the window. */
  at_start: boolean;
  /** Touches the last computed instant; may continue past the window. */
  at_end: boolean;
}

export interface ClientAvailabilityMetrics {
  client_id: string;
  /** Fraction of instants with at least one visible active satellite. */
  visibility_fraction: number;
  /** Fraction of instants with a complete client -> gateway route. */
  availability_fraction: number;
  /** availability_fraction checked against the scenario's own target_availability. */
  meets_target_availability: boolean;
  max_outage_s: number;
  /** Sum of every outage run's duration, not just the longest one. */
  total_downtime_s: number;
  outage_runs: OutageRun[];
  outage_count: number;
  /** Distinct hop counts observed across the horizon, for display. */
  min_hop_count: number | null;
  max_hop_count: number | null;
  mean_rtt_ms: number | null;
  p95_rtt_ms: number | null;
  /** Mean absolute change in RTT between consecutive connected samples. */
  jitter_ms: number | null;
  /** Serving-satellite changes observed while staying continuously connected. */
  handover_count: number;
}

export interface SeriesMetrics {
  target_availability: number;
  per_client: ClientAvailabilityMetrics[];
}
