/**
 * Building blocks every pathfinding strategy in this folder shares: the
 * contact graph for a snapshot (who can see whom) and the "no route"
 * preconditions that must be checked identically regardless of which
 * strategy is asking, so the reported reason never depends on the algorithm
 * — only on the actual network state. Individual strategies (`bfsByHops.ts`,
 * `dijkstraByDistance.ts`, `widestPathByMargin.ts`,
 * `greedyNearestNeighbor.ts`) each call `prepareRouteSearch` first, then
 * search this same graph in their own way.
 */
import type { GroundSite, NoRouteReason, Route, Scenario, Snapshot } from "../../domain";

export type RouteWithoutAlgorithm = Omit<Route, "algorithm">;

export interface WeightedEdge {
  to: string;
  distanceKm: number;
}

export function reachableSatIds(snapshot: Snapshot, siteId: string): Set<string> {
  const entries = snapshot.elevation_deg[siteId] ?? [];
  return new Set(entries.filter((e) => e.visible).map((e) => e.satellite_id));
}

export interface GatewayReachability {
  /** satId -> gateway id, satellites in geometric contact with a gateway regardless of outage. */
  geometricallyNearGateway: Map<string, string>;
  /** satId -> gateway id, excludes gateways currently administratively down. */
  usableGateway: Map<string, string>;
  anyGatewayDown: boolean;
}

export function gatewayReachability(scenario: Scenario, snapshot: Snapshot): GatewayReachability {
  const geometricallyNearGateway = new Map<string, string>();
  const usableGateway = new Map<string, string>();
  let anyGatewayDown = false;
  for (const gw of scenario.ground_sites) {
    if (gw.role !== "gateway") continue;
    const down = snapshot.gateway_down[gw.id] ?? false;
    if (down) anyGatewayDown = true;
    for (const satId of reachableSatIds(snapshot, gw.id)) {
      geometricallyNearGateway.set(satId, gw.id);
      if (!down) usableGateway.set(satId, gw.id);
    }
  }
  return { geometricallyNearGateway, usableGateway, anyGatewayDown };
}

/** Undirected adjacency among active satellites, carrying each ISL edge's already-known distance so weighted strategies don't need to re-derive it from raw positions. */
export function islAdjacency(snapshot: Snapshot): Map<string, WeightedEdge[]> {
  const adjacency = new Map<string, WeightedEdge[]>();
  const link = (a: string, b: string, distanceKm: number) => {
    (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push({ to: b, distanceKm });
  };
  for (const [a, b, distanceKm] of snapshot.edges) {
    link(a, b, distanceKm);
    link(b, a, distanceKm);
  }
  return adjacency;
}

export function emptyRoute(snapshot: Snapshot, client: GroundSite, reason: NoRouteReason): RouteWithoutAlgorithm {
  return { t_s: snapshot.t_s, client_id: client.id, gateway_id: null, path: [], nodes: [], hop_count: null, reason };
}

export function buildRoute(
  snapshot: Snapshot,
  client: GroundSite,
  satPath: string[],
  gatewayId: string,
): RouteWithoutAlgorithm {
  const path = [client.id, ...satPath, gatewayId];
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

/** Walks a predecessor chain built during a search back into a client->...->target satellite path, in order. */
export function unwindPath(predecessor: Map<string, string | null>, target: string): string[] {
  const satPath: string[] = [];
  let cursor: string | null = target;
  while (cursor !== null) {
    satPath.unshift(cursor);
    cursor = predecessor.get(cursor) ?? null;
  }
  return satPath;
}

export type RouteSearchPrep =
  | { ok: true; clientVisible: Set<string>; adjacency: Map<string, WeightedEdge[]>; reachability: GatewayReachability }
  | { ok: false; route: RouteWithoutAlgorithm };

/**
 * Checks the preconditions every strategy must agree on before searching the
 * mesh at all: is the client looking at any satellite, and is at least one
 * gateway reachable and up. Only once both hold does it make sense to ask
 * "which specific path" — that question is left entirely to the caller.
 */
export function prepareRouteSearch(scenario: Scenario, snapshot: Snapshot, client: GroundSite): RouteSearchPrep {
  const clientVisible = reachableSatIds(snapshot, client.id);
  if (clientVisible.size === 0) return { ok: false, route: emptyRoute(snapshot, client, "no_visible_satellite") };

  const reachability = gatewayReachability(scenario, snapshot);
  if (reachability.usableGateway.size === 0) {
    const reason: NoRouteReason =
      reachability.geometricallyNearGateway.size === 0
        ? "gateway_unreachable"
        : reachability.anyGatewayDown
          ? "gateway_down"
          : "gateway_unreachable";
    return { ok: false, route: emptyRoute(snapshot, client, reason) };
  }

  return { ok: true, clientVisible, adjacency: islAdjacency(snapshot), reachability };
}
