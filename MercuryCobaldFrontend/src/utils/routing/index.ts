/**
 * Route search: builds the contact graph for one instant, then delegates the
 * actual path search to whichever `PathfindingStrategy` was selected (see
 * `registry.ts`) — the graph/reason-determination logic here is shared by
 * every algorithm and re-run from scratch whenever the mesh changes
 * (failures, RAAN/phase edits, launch stage). See "Алгоритмы маршрутизации"
 * in "Критерии оценки".
 */
import type { GroundSite, Route, RoutingAlgorithmId, Scenario, Snapshot } from "../../domain";
import { buildPathfindingGraph } from "./graph";
import { ROUTING_STRATEGIES } from "./registry";

export type { PathfindingEdge, PathfindingGraph, PathfindingResult, PathfindingStrategy } from "./types";
export { buildPathfindingGraph } from "./graph";
export { summarizePath, type PathSummary } from "./metrics";
export { ROUTING_STRATEGIES } from "./registry";

export function computeRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite, algorithmId: RoutingAlgorithmId): Route {
  const empty = (reason: Route["reason"]): Route => ({
    t_s: snapshot.t_s,
    client_id: client.id,
    gateway_id: null,
    path: [],
    nodes: [],
    hop_count: null,
    reason,
  });

  const { graph, noVisibleSatellite, hasGeometricGatewayContact, anyGatewayDown } = buildPathfindingGraph(
    scenario,
    snapshot,
    client,
  );

  if (noVisibleSatellite) return empty("no_visible_satellite");
  if (graph.gatewayIds.size === 0) {
    return empty(hasGeometricGatewayContact && anyGatewayDown ? "gateway_down" : "gateway_unreachable");
  }

  const strategy = ROUTING_STRATEGIES[algorithmId];
  const { path } = strategy.findPath(graph);
  if (path.length === 0) return empty("isl_mesh_broken");

  const gatewayId = path[path.length - 1]!;
  return {
    t_s: snapshot.t_s,
    client_id: client.id,
    gateway_id: gatewayId,
    path,
    nodes: path.map((id, idx) => ({
      id,
      kind: idx === 0 ? "client" : idx === path.length - 1 ? "gateway" : "satellite",
    })),
    hop_count: path.length - 1,
    reason: null,
  };
}
