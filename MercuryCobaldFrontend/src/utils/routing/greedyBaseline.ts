/**
 * Naive nearest-neighbor baseline, included deliberately as a weaker
 * comparison point (not a recommended algorithm): from the client, always
 * step to the closest unvisited neighbor, never backtrack, stop at a gateway
 * or when stuck. Unlike the other three strategies this has no optimality
 * guarantee and no completeness guarantee either — it can dead-end even when
 * a perfectly good path exists, which is exactly the point: it demonstrates
 * why a principled search (BFS/Dijkstra/widest-path) is worth having.
 */
import type { PathfindingGraph, PathfindingResult, PathfindingStrategy } from "./types";

function search(graph: PathfindingGraph): PathfindingResult {
  const { adjacency, clientId, gatewayIds } = graph;
  const path: string[] = [clientId];
  const visited = new Set<string>([clientId]);
  let current = clientId;

  while (!gatewayIds.has(current)) {
    let next: string | null = null;
    let nextDist = Infinity;
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      if (edge.distance_km < nextDist) {
        nextDist = edge.distance_km;
        next = edge.to;
      }
    }
    if (next === null) return { path: [] }; // Dead end — the whole point of a naive baseline.
    visited.add(next);
    path.push(next);
    current = next;
  }

  return { path };
}

export const greedyBaseline: PathfindingStrategy = { id: "greedy-baseline", findPath: search };
