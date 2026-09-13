/**
 * Whole-path aggregates used only for display (the Route panel's per-
 * algorithm comparison table) — never by a strategy's own search, which
 * tracks its optimised quantity incrementally instead of recomputing it from
 * a finished path.
 */
import type { Scenario, Snapshot } from "../../domain";
import { distanceKm, nodePosition } from "../nodePosition";

export function pathTotalDistanceKm(scenario: Scenario, snapshot: Snapshot, path: string[]): number | null {
  if (path.length < 2) return null;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodePosition(path[i]!, scenario, snapshot);
    const b = nodePosition(path[i + 1]!, scenario, snapshot);
    if (!a || !b) return null;
    total += distanceKm(a, b);
  }
  return total;
}
