/**
 * Breadth-first search: minimises the number of hops from a client ground
 * site through active, ISL-connected satellites to any reachable, non-outaged
 * gateway. BFS visits satellites in non-decreasing order of hop-distance from
 * the client, and every usable-gateway satellite costs exactly one further
 * hop to reach the gateway regardless of which one it is — so the first such
 * satellite popped is already the global optimum; no need to search the rest
 * of the mesh once found (unlike the distance/margin strategies, whose final
 * leg cost varies satellite to satellite).
 */
import type { GroundSite, Scenario, Snapshot } from "../../domain";
import { buildRoute, emptyRoute, prepareRouteSearch, unwindPath, type RouteWithoutAlgorithm } from "./graph";

export function fewestHopsRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite): RouteWithoutAlgorithm {
  const prep = prepareRouteSearch(scenario, snapshot, client);
  if (!prep.ok) return prep.route;
  const { clientVisible, adjacency, reachability } = prep;

  const visited = new Set(clientVisible);
  const predecessor = new Map<string, string | null>();
  const queue: string[] = [];
  for (const satId of clientVisible) {
    predecessor.set(satId, null);
    queue.push(satId);
  }

  let targetSat: string | null = null;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    if (reachability.usableGateway.has(current)) {
      targetSat = current;
      break;
    }
    for (const { to: next } of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      predecessor.set(next, current);
      queue.push(next);
    }
  }

  if (targetSat === null) return emptyRoute(snapshot, client, "isl_mesh_broken");
  return buildRoute(snapshot, client, unwindPath(predecessor, targetSat), reachability.usableGateway.get(targetSat)!);
}
