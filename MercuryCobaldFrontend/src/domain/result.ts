import type { Scenario } from "./scenario";
import type { SeriesMetrics } from "./metrics";

/** One routing record per (computation instant, client) pair, per export format. */
export interface RouteRecord {
  t_s: number;
  client_id: string;
  path: string[];
}

/** Exported result, per "Сохранение и выгрузка": schema_version, effective_scenario, routes. */
export interface ResultExport {
  schema_version: "cosmo-A-result-1.0";
  effective_scenario: Scenario;
  routes: RouteRecord[];
  /** Additive summary, not part of the required contract but allowed by the spec. */
  metrics?: SeriesMetrics;
  notes?: string;
}
