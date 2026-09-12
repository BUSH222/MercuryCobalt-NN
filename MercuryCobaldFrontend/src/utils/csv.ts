/** Quotes a field only when it contains a character that would otherwise break the format. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes a header + rows into RFC 4180-ish CSV text (CRLF line endings). */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((row) => row.map((cell) => csvField(String(cell))).join(",")).join("\r\n");
}
