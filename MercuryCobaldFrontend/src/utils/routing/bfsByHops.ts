/**
 * Minimum-hop-count strategy: plain breadth-first search, ignoring both
 * physical distance and margin. This is the original (pre strategy-pattern)
 * routing behavior, now expressed as one implementation of `PathfindingStrategy`
 * among several — unweighted BFS is optimal for "fewest edges" on an
 * unweighted graph, and the graph here is small (<=48 satellites) so no
 * priority queue is needed.
 */
import type { PathfindingGraph, PathfindingResult, PathfindingStrategy } from "./types";

function search(graph: PathfindingGraph): PathfindingResult {
  const { adjacency, clientId, gatewayIds } = graph;
  const visited = new Set<string>([clientId]);
  const predecessor = new Map<string, string | null>([[clientId, null]]);
  const queue: string[] = [clientId];

  let target: string | null = null;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    if (current !== clientId && gatewayIds.has(current)) {
      target = current;
      break;
    }
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      predecessor.set(edge.to, current);
      queue.push(edge.to);
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

export const bfsByHops: PathfindingStrategy = { id: "fewest-hops", findPath: search };
