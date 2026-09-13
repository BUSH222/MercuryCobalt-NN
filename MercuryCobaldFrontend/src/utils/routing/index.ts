/**
 * Route search dispatcher. Each pathfinding strategy lives in its own file
 * behind the same signature (`(scenario, snapshot, client) => route`) — see
 * `graph.ts`'s shared `prepareRouteSearch`/`buildRoute` helpers they're all
 * built on — and this module only picks which one runs and stamps the
 * result with which algorithm produced it. Adding a fifth algorithm, or
 * later swapping one for a call to a real backend, means adding or replacing
 * one entry in `STRATEGIES` below, not touching this dispatch or any other
 * strategy.
 *
 * Floyd–Warshall (all-pairs shortest paths) was considered, since a dense
 * ISL mesh makes it attractive when many clients need routing in the same
 * snapshot — but it would solve the exact same objective as
 * `shortestDistanceRoute` (minimum total distance) and so return the
 * identical path; it would only ever be a performance choice for computing
 * every client at once, never a distinct option for someone picking a
 * *strategy* in Settings. Left out for that reason, not overlooked.
 */
import type { GroundSite, Route, RoutingAlgorithmId, Scenario, Snapshot } from "../../domain";
import { DEFAULT_ROUTING_ALGORITHM } from "../../domain";
import { fewestHopsRoute } from "./bfsByHops";
import { shortestDistanceRoute } from "./dijkstraByDistance";
import { widestMarginRoute } from "./widestPathByMargin";
import { greedyNearestRoute } from "./greedyNearestNeighbor";
import type { RouteWithoutAlgorithm } from "./graph";

type PathfindingStrategy = (scenario: Scenario, snapshot: Snapshot, client: GroundSite) => RouteWithoutAlgorithm;

const STRATEGIES: Record<RoutingAlgorithmId, PathfindingStrategy> = {
  "shortest-distance": shortestDistanceRoute,
  "fewest-hops": fewestHopsRoute,
  "widest-margin": widestMarginRoute,
  "greedy-nearest": greedyNearestRoute,
};

export function computeRoute(
  scenario: Scenario,
  snapshot: Snapshot,
  client: GroundSite,
  algorithm: RoutingAlgorithmId = DEFAULT_ROUTING_ALGORITHM,
): Route {
  return { ...STRATEGIES[algorithm](scenario, snapshot, client), algorithm };
}

export { pathBottleneckMargin } from "./margins";
export { pathTotalDistanceKm } from "./pathStats";
