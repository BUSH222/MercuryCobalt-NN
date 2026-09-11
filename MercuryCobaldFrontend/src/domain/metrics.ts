/**
 * Aggregate availability metrics per ground site over the full computation
 * horizon, per "Показатели результата" in "Описание данных".
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
  max_outage_s: number;
  outage_runs: OutageRun[];
  /** Distinct hop counts observed across the horizon, for display. */
  min_hop_count: number | null;
  max_hop_count: number | null;
}

export interface SeriesMetrics {
  target_availability: number;
  per_client: ClientAvailabilityMetrics[];
}
