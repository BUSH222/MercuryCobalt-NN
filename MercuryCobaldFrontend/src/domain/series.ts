import type { Snapshot } from "./snapshot";
import type { Route } from "./routing";
import type { SeriesMetrics } from "./metrics";

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
  metrics: SeriesMetrics;
}
