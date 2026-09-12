import type { Scenario, SavedVariant } from "../domain";

/** Human-readable summary of what a saved variant changed relative to the originally loaded scenario. */
export function summarizeVariant(baseline: Scenario, variant: SavedVariant): string[] {
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
  if (lines.length === 0) lines.push("Без изменений относительно исходного сценария");
  return lines;
}
