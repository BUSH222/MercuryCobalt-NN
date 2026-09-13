/**
 * Deliberately naive baseline, kept only for comparison: at every hop it
 * jumps to whichever unvisited neighbour is physically nearest, with no
 * lookahead and no backtracking. It has no idea whether that choice leads
 * anywhere near a gateway, so it can and does dead-end (reported as
 * "isl_mesh_broken") even when `shortestDistanceRoute` or `fewestHopsRoute`
 * would find a perfectly good path from the very same snapshot. That gap is
 * the point — it demonstrates what smarter routing buys over a greedy local
 * choice, not a routing option meant to be relied on.
 */
import type { GroundSite, Scenario, Snapshot } from "../../domain";
import { distanceKm, nodePosition } from "../nodePosition";
import { buildRoute, emptyRoute, prepareRouteSearch, type RouteWithoutAlgorithm } from "./graph";

export function greedyNearestRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite): RouteWithoutAlgorithm {
  const prep = prepareRouteSearch(scenario, snapshot, client);
  if (!prep.ok) return prep.route;
  const { clientVisible, adjacency, reachability } = prep;

  const clientPos = nodePosition(client.id, scenario, snapshot)!;
  let current = "";
  let bestDist = Infinity;
  for (const satId of clientVisible) {
    const d = distanceKm(clientPos, nodePosition(satId, scenario, snapshot)!);
    if (d < bestDist) {
      bestDist = d;
      current = satId;
    }
  }

  const satPath = [current];
  const visited = new Set(satPath);
  while (!reachability.usableGateway.has(current)) {
    const candidates = (adjacency.get(current) ?? []).filter((e) => !visited.has(e.to));
    if (candidates.length === 0) return emptyRoute(snapshot, client, "isl_mesh_broken");
    let next = candidates[0]!.to;
    let nextDist = candidates[0]!.distanceKm;
    for (const edge of candidates) {
      if (edge.distanceKm < nextDist) {
        next = edge.to;
        nextDist = edge.distanceKm;
      }
    }
    satPath.push(next);
    visited.add(next);
    current = next;
  }

  return buildRoute(snapshot, client, satPath, reachability.usableGateway.get(current)!);
}
