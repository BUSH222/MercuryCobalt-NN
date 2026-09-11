/**
 * Route search: breadth-first search for the shortest (fewest-hop) path from a
 * client ground site through active, ISL-connected satellites to any reachable,
 * non-outaged gateway. BFS is used because the graph is unweighted (a hop is a
 * hop) and small (<=48 satellites); it is re-run from scratch whenever the
 * mesh changes (failures, RAAN/phase edits, launch stage). See
 * "Алгоритмы маршрутизации" in "Критерии оценки".
 */
import type { GroundSite, Route, Scenario, Snapshot } from "../domain";

function reachableSatIds(snapshot: Snapshot, siteId: string): Set<string> {
  const entries = snapshot.elevation_deg[siteId] ?? [];
  return new Set(entries.filter((e) => e.visible).map((e) => e.satellite_id));
}

export function computeRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite): Route {
  const gateways = scenario.ground_sites.filter((s) => s.role === "gateway");
  const clientVisible = reachableSatIds(snapshot, client.id);

  const empty = (reason: Route["reason"]): Route => ({
    t_s: snapshot.t_s,
    client_id: client.id,
    gateway_id: null,
    path: [],
    nodes: [],
    hop_count: null,
    reason,
  });

  if (clientVisible.size === 0) return empty("no_visible_satellite");

  // Union of satellites currently in geometric contact with a gateway, keyed by which
  // gateway they reach, ignoring outage state (used to distinguish reasons below).
  const satsGeometricallyNearGateway = new Map<string, string>(); // satId -> gatewayId
  const satsUsableGateway = new Map<string, string>(); // satId -> gatewayId, excludes down gateways
  let anyGatewayDown = false;
  for (const gw of gateways) {
    const down = snapshot.gateway_down[gw.id] ?? false;
    if (down) anyGatewayDown = true;
    const visible = reachableSatIds(snapshot, gw.id);
    for (const satId of visible) {
      satsGeometricallyNearGateway.set(satId, gw.id);
      if (!down) satsUsableGateway.set(satId, gw.id);
    }
  }

  if (satsUsableGateway.size === 0) {
    if (satsGeometricallyNearGateway.size === 0) return empty("gateway_unreachable");
    if (anyGatewayDown) return empty("gateway_down");
    return empty("gateway_unreachable");
  }

  // Adjacency among active satellites from the snapshot's ISL edges.
  const adjacency = new Map<string, string[]>();
  for (const [a, b] of snapshot.edges) {
    (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push(b);
    (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push(a);
  }

  const visited = new Set<string>(clientVisible);
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
    if (satsUsableGateway.has(current)) {
      targetSat = current;
      break;
    }
    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      predecessor.set(next, current);
      queue.push(next);
    }
  }

  if (targetSat === null) return empty("isl_mesh_broken");

  const satPath: string[] = [];
  let cursor: string | null = targetSat;
  while (cursor !== null) {
    satPath.unshift(cursor);
    cursor = predecessor.get(cursor) ?? null;
  }

  const gatewayId = satsUsableGateway.get(targetSat)!;
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
