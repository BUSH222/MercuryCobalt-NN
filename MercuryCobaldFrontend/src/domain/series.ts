import type { Snapshot } from "./snapshot";
import type { Route } from "./routing";
import type { SeriesMetrics } from "./metrics";
import type { ClientLinkSample } from "./linkMetrics";
import type { ConstellationStepStats } from "./constellationStats";

/**
 * Full computation result across the whole time grid (0, step_s, 2*step_s, ...,
 * up to but excluding horizon_s), as produced by a single "Запустить расчёт" run.
 */
export interface SeriesResult {
  computed_at: string;
  t_grid_s: number[];
  snapshots: Snapshot[];
  /** Client id -> route per instant, aligned index-for-index with t_grid_s. */
  routes_by_client: Record<string, Route[]>;
  /** Client id -> enriched link sample per instant (distance/RTT/quality/robustness). */
  client_samples: Record<string, ClientLinkSample[]>;
  /** One entry per instant, aggregated once across every client. */
  constellation_steps: ConstellationStepStats[];
  metrics: SeriesMetrics;
}
