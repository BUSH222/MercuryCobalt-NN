export type TimeDisplayUnit = "seconds" | "hms";

export function formatTime(tS: number, unit: TimeDisplayUnit): string {
  if (unit === "seconds") return `${tS} с`;
  const hours = Math.floor(tS / 3600);
  const minutes = Math.floor((tS % 3600) / 60);
  const seconds = tS % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

export function formatDuration(seconds: number, unit: TimeDisplayUnit): string {
  if (seconds === 0) return unit === "seconds" ? "0 с" : "00:00:00";
  return formatTime(seconds, unit);
}
