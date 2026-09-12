/**
 * Shortest-physical-distance strategy (Dijkstra), the default algorithm.
 * Minimizes the sum of `distance_km` across ground legs and ISL hops alike,
 * which is the same quantity `utils/linkMetrics.ts` sums into
 * `total_distance_km` — so the reported RTT/FSPL for a route found by this
 * strategy is, by construction, the best this scenario's geometry can offer
 * at this instant. A plain O(V^2) relaxation loop (no heap) is used since the
 * graph is small (client + up to 48 satellites + gateways).
 */
import type { PathfindingGraph, PathfindingResult, PathfindingStrategy } from "./types";

function search(graph: PathfindingGraph): PathfindingResult {
  const { adjacency, clientId, gatewayIds } = graph;
  const dist = new Map<string, number>([[clientId, 0]]);
  const predecessor = new Map<string, string | null>([[clientId, null]]);
  const settled = new Set<string>();

  for (;;) {
    let current: string | null = null;
    let currentDist = Infinity;
    for (const [id, d] of dist) {
      if (!settled.has(id) && d < currentDist) {
        current = id;
        currentDist = d;
      }
    }
    if (current === null) break;
    settled.add(current);
    if (current !== clientId && gatewayIds.has(current)) break;

    for (const edge of adjacency.get(current) ?? []) {
      if (settled.has(edge.to)) continue;
      const candidate = currentDist + edge.distance_km;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        predecessor.set(edge.to, current);
      }
    }
  }

  let target: string | null = null;
  let best = Infinity;
  for (const gwId of gatewayIds) {
    const d = dist.get(gwId);
    if (d !== undefined && d < best) {
      best = d;
      target = gwId;
    }
  }
  if (target === null) return { path: [] };

  const path: string[] = [];
  let cursor: string | null = target;
  while (cursor !== null) {
    path.unshift(cursor);
    cursor = predecessor.get(cursor) ?? null;
  }
  return { path };
}

export const dijkstraByDistance: PathfindingStrategy = { id: "shortest-distance", findPath: search };
