/**
 * Maximum-bottleneck-margin strategy ("widest path"): a Dijkstra variant that,
 * instead of summing edge weights, tracks the *minimum* `margin_ratio` seen
 * along a path and keeps relaxing towards whichever path has the largest such
 * minimum. This picks the route whose weakest link (lowest elevation margin
 * or ISL range margin) is as strong as possible — i.e. the route least likely
 * to break from a small geometry shift, rather than the shortest one.
 */
import type { PathfindingGraph, PathfindingResult, PathfindingStrategy } from "./types";

function search(graph: PathfindingGraph): PathfindingResult {
  const { adjacency, clientId, gatewayIds } = graph;
  const bottleneck = new Map<string, number>([[clientId, Infinity]]);
  const predecessor = new Map<string, string | null>([[clientId, null]]);
  const settled = new Set<string>();

  for (;;) {
    let current: string | null = null;
    let currentBottleneck = -Infinity;
    for (const [id, b] of bottleneck) {
      if (!settled.has(id) && b > currentBottleneck) {
        current = id;
        currentBottleneck = b;
      }
    }
    if (current === null) break;
    settled.add(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (settled.has(edge.to)) continue;
      const candidate = Math.min(currentBottleneck, edge.margin_ratio);
      if (candidate > (bottleneck.get(edge.to) ?? -Infinity)) {
        bottleneck.set(edge.to, candidate);
        predecessor.set(edge.to, current);
      }
    }
  }

  let target: string | null = null;
  let best = -Infinity;
  for (const gwId of gatewayIds) {
    const b = bottleneck.get(gwId);
    if (b !== undefined && b > best) {
      best = b;
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

export const widestPathByMargin: PathfindingStrategy = { id: "widest-margin", findPath: search };
