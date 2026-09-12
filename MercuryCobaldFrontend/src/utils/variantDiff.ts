import type { SavedVariant } from "../domain";
import { DEFAULT_SIM_DATE } from "../domain";

/**
 * Human-readable summary of what a saved variant changed relative to the
 * scenario it was actually saved from (`variant.baseline`) — not whatever
 * scenario happens to be loaded right now. Comparing variants saved from two
 * different source files (see "Загрузить другой сценарий") only makes sense
 * if each one keeps diffing against its own origin.
 */
export function summarizeVariant(variant: SavedVariant): string[] {
  const baseline = variant.baseline;
  const lines: string[] = [];
  if (variant.overrides.launch_stage !== baseline.design.launch_stage) {
    lines.push(`Этап запуска: ${variant.overrides.launch_stage}`);
  }
  const changedPlanes = Object.keys(variant.overrides.plane_overrides);
  if (changedPlanes.length > 0) {
    lines.push(`Изменены плоскости: ${changedPlanes.join(", ")}`);
  }
  if (variant.overrides.added_failures.length > 0) {
    lines.push(`Добавлено отказов: ${variant.overrides.added_failures.length}`);
  }
  if ((variant.overrides.sim_date ?? DEFAULT_SIM_DATE) !== DEFAULT_SIM_DATE) {
    lines.push(`Дата симуляции: ${variant.overrides.sim_date}`);
  }
  if (lines.length === 0) lines.push("Без изменений относительно исходного сценария");
  return lines;
}
