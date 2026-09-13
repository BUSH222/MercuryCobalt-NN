/**
 * Dijkstra over physical distance (km): minimises total path length end to
 * end, a proxy for minimum propagation delay. ISL hops reuse the distance
 * already carried by `snapshot.edges`; only the two ground legs (client to
 * its first satellite, last satellite to the gateway) need a fresh distance
 * from ECEF positions.
 *
 * Relaxation runs to completion over every satellite reachable from the
 * client, rather than stopping at the first usable-gateway satellite popped
 * (that shortcut is only valid for unweighted BFS, where every gateway leg
 * costs the same one hop). Here the final leg's length varies satellite to
 * satellite, so the true optimum can only be picked after every reachable
 * usable-gateway satellite's total (mesh distance + its own gateway leg) is
 * known — done in a second pass below.
 *
 * Plain O(V^2) selection, no binary heap: with at most a few dozen satellites
 * per snapshot this is negligible, and it keeps the loop easy to read next to
 * the other strategies in this folder.
 */
import type { GroundSite, Scenario, Snapshot } from "../../domain";
import { distanceKm, nodePosition } from "../nodePosition";
import { buildRoute, emptyRoute, prepareRouteSearch, unwindPath, type RouteWithoutAlgorithm } from "./graph";

export function shortestDistanceRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite): RouteWithoutAlgorithm {
  const prep = prepareRouteSearch(scenario, snapshot, client);
  if (!prep.ok) return prep.route;
  const { clientVisible, adjacency, reachability } = prep;

  const clientPos = nodePosition(client.id, scenario, snapshot)!;
  const dist = new Map<string, number>();
  const predecessor = new Map<string, string | null>();
  const settled = new Set<string>();
  for (const satId of clientVisible) {
    dist.set(satId, distanceKm(clientPos, nodePosition(satId, scenario, snapshot)!));
    predecessor.set(satId, null);
  }

  for (;;) {
    let current: string | null = null;
    let currentDist = Infinity;
    for (const [satId, d] of dist) {
      if (!settled.has(satId) && d < currentDist) {
        current = satId;
        currentDist = d;
      }
    }
    if (current === null) break;
    settled.add(current);
    for (const { to: next, distanceKm: legKm } of adjacency.get(current) ?? []) {
      if (settled.has(next)) continue;
      const candidate = currentDist + legKm;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        predecessor.set(next, current);
      }
    }
  }

  let targetSat: string | null = null;
  let bestTotal = Infinity;
  for (const [satId, gatewayId] of reachability.usableGateway) {
    const meshDist = dist.get(satId);
    if (meshDist === undefined) continue;
    const gatewayLeg = distanceKm(nodePosition(satId, scenario, snapshot)!, nodePosition(gatewayId, scenario, snapshot)!);
    const total = meshDist + gatewayLeg;
    if (total < bestTotal) {
      bestTotal = total;
      targetSat = satId;
    }
  }

  if (targetSat === null) return emptyRoute(snapshot, client, "isl_mesh_broken");
  return buildRoute(snapshot, client, unwindPath(predecessor, targetSat), reachability.usableGateway.get(targetSat)!);
}
