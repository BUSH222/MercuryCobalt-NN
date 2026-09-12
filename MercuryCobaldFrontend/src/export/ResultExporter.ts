import type { Scenario, SeriesResult } from "../domain";

/** A downloadable file, format-agnostic — what `downloadText` needs to trigger the browser save. */
export interface ExportedFile {
  filename: string;
  mimeType: string;
  content: string;
}

export type ResultExportFormatId = "json" | "routes-csv" | "availability-csv";

/**
 * One exportable rendering of the current computation result. JSON and CSV
 * solve different jobs (round-trippable full result vs. a flat table for a
 * spreadsheet) rather than being the same data in two syntaxes, so each
 * format gets its own strategy instead of one exporter with a `format` flag —
 * adding a fourth format later is just one more file, no branching to extend.
 */
export interface ResultExporter {
  id: ResultExportFormatId;
  label: string;
  export(scenario: Scenario, series: SeriesResult): ExportedFile;
}
