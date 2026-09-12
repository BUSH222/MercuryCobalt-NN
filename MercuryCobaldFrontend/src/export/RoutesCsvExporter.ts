import type { ResultExporter } from "./ResultExporter";
import { scenarioApi } from "../services/scenarioApi";
import { toCsv } from "../utils/csv";

/**
 * One row per (t_s, client_id) pair. `path` is the route's node ids joined by
 * "|" rather than one column per hop — hop count varies over time, so a
 * fixed hop_1/hop_2/... layout would either truncate long routes or leave a
 * ragged table; a single delimited column stays flat regardless of length.
 */
export const routesCsvExporter: ResultExporter = {
  id: "routes-csv",
  label: "CSV (маршруты)",
  export(scenario, series) {
    const { routes } = scenarioApi.buildResultExport(scenario, series);
    const rows = routes.map((r) => [r.t_s, r.client_id, r.path.join("|")]);
    return {
      filename: `${scenario.meta.id}-routes.csv`,
      mimeType: "text/csv",
      content: toCsv(["t_s", "client_id", "path"], rows),
    };
  },
};
