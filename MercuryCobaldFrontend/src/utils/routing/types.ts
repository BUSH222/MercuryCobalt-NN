/**
 * Shared shapes for the pathfinding strategy pattern. Every algorithm searches
 * the same weighted, undirected graph — ground legs (client<->satellite,
 * satellite<->gateway) and ISL legs (satellite<->satellite) are all just edges
 * of one graph, keyed by node id (client/satellite/gateway ids never collide,
 * enforced by `validation.ts`). This lets an algorithm pick the best entry/exit
 * satellite itself instead of the graph builder guessing for it.
 */
import type { RoutingAlgorithmId } from "../../domain";

export interface PathfindingEdge {
  to: string;
  distance_km: number;
  /**
   * Normalized safety margin in (0, 1]: how far this edge is from becoming
   * physically impossible. ISL edges: `(isl_range_km - distance_km) /
   * isl_range_km`. Ground edges: `(elevation_deg - min_elevation_deg) / (90 -
   * min_elevation_deg)`. Both are unitless fractions of "room before this
   * edge disappears", which is what makes them comparable/combinable even
   * though one starts from kilometers and the other from degrees.
   */
  margin_ratio: number;
}

export interface PathfindingGraph {
  /** id -> outgoing edges. Undirected: every edge appears in both endpoints' lists. */
  adjacency: Map<string, PathfindingEdge[]>;
  clientId: string;
  /** Ids of gateway nodes currently reachable and usable (not administratively down); reaching any one of them is a valid destination. */
  gatewayIds: Set<string>;
}

export interface PathfindingResult {
  /** Full ordered path of ids from client to the reached gateway, inclusive; empty when no path exists. */
  path: string[];
}

export interface PathfindingStrategy {
  id: RoutingAlgorithmId;
  findPath(graph: PathfindingGraph): PathfindingResult;
}
