import type { ResultExporter } from "./ResultExporter";
import { toCsv } from "../utils/csv";

/** One row per client ground site — the aggregate availability metrics, not the per-instant route grid. */
export const availabilityCsvExporter: ResultExporter = {
  id: "availability-csv",
  label: "CSV (показатели доступности)",
  export(scenario, series) {
    const rows = series.metrics.per_client.map((m) => [
      m.client_id,
      (m.visibility_fraction * 100).toFixed(2),
      (m.availability_fraction * 100).toFixed(2),
      m.max_outage_s,
    ]);
    return {
      filename: `${scenario.meta.id}-availability.csv`,
      mimeType: "text/csv",
      content: toCsv(["client_id", "visibility_pct", "availability_pct", "max_outage_s"], rows),
    };
  },
};
