/**
 * Describes an already-found path in terms every algorithm can be judged by,
 * regardless of what it actually optimized for — this is what powers the
 * algorithm-comparison mini-table (hop count / distance / margin side by side
 * for all four strategies at the current instant).
 */
import type { PathfindingGraph } from "./types";

export interface PathSummary {
  hop_count: number;
  total_distance_km: number;
  /** Smallest margin_ratio among the path's edges; null for a path with no edges (degenerate/empty). */
  bottleneck_margin_ratio: number | null;
}

export function summarizePath(graph: PathfindingGraph, path: string[]): PathSummary | null {
  if (path.length < 2) return null;
  let totalDistanceKm = 0;
  let bottleneck = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!;
    const to = path[i + 1]!;
    const edge = (graph.adjacency.get(from) ?? []).find((e) => e.to === to);
    if (!edge) return null; // Shouldn't happen for a path an algorithm actually returned.
    totalDistanceKm += edge.distance_km;
    bottleneck = Math.min(bottleneck, edge.margin_ratio);
  }
  return { hop_count: path.length - 1, total_distance_km: totalDistanceKm, bottleneck_margin_ratio: bottleneck };
}
