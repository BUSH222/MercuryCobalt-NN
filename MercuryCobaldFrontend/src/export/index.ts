export type { ResultExporter, ExportedFile, ResultExportFormatId } from "./ResultExporter";
import type { ResultExporter } from "./ResultExporter";
import { jsonResultExporter } from "./JsonResultExporter";
import { routesCsvExporter } from "./RoutesCsvExporter";
import { availabilityCsvExporter } from "./AvailabilityCsvExporter";

export { jsonResultExporter, routesCsvExporter, availabilityCsvExporter };

/** Every available result-export strategy, in the order offered to the user. */
export const RESULT_EXPORTERS: ResultExporter[] = [jsonResultExporter, routesCsvExporter, availabilityCsvExporter];
