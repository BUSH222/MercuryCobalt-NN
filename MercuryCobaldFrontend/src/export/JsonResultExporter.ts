import type { ResultExporter } from "./ResultExporter";
import { scenarioApi } from "../services/scenarioApi";

/** The full `cosmo-A-result-1.0` document — schema_version, effective_scenario, routes, metrics. */
export const jsonResultExporter: ResultExporter = {
  id: "json",
  label: "JSON (полный результат)",
  export(scenario, series) {
    const result = scenarioApi.buildResultExport(scenario, series);
    return {
      filename: `${scenario.meta.id}-result.json`,
      mimeType: "application/json",
      content: JSON.stringify(result, null, 2),
    };
  },
};
