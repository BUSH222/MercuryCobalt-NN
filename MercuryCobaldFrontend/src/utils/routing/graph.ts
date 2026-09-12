/**
 * Builds the weighted pathfinding graph for one (scenario, snapshot, client)
 * instant, plus the facts needed to explain *why* there's no path when the
 * graph turns out to have no usable destination — this part is shared across
 * every algorithm (it's about which endpoints are legal, not how to search
 * between them) so no strategy has to reimplement gateway-down detection.
 */
import type { GroundSite, Scenario, Snapshot } from "../../domain";
import { distanceKm, groundSiteEcef, type Vec3 } from "../geometry";
import type { PathfindingEdge, PathfindingGraph } from "./types";

function addUndirectedEdge(adjacency: Map<string, PathfindingEdge[]>, a: string, b: string, edge: Omit<PathfindingEdge, "to">): void {
  (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push({ to: b, ...edge });
  (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push({ to: a, ...edge });
}

/** `(value - floor) / (ceiling - floor)`, guarding a degenerate zero-width range. */
function marginRatio(value: number, floor: number, ceiling: number): number {
  const span = ceiling - floor;
  if (span <= 0) return value >= floor ? 1 : 0;
  return (value - floor) / span;
}

export interface PathfindingBuildResult {
  graph: PathfindingGraph;
  /** No satellite is currently visible from the client at all. */
  noVisibleSatellite: boolean;
  /** At least one gateway is geometrically in contact with some satellite, ignoring outage state. */
  hasGeometricGatewayContact: boolean;
  anyGatewayDown: boolean;
}

export function buildPathfindingGraph(scenario: Scenario, snapshot: Snapshot, client: GroundSite): PathfindingBuildResult {
  const adjacency = new Map<string, PathfindingEdge[]>();
  const minElevationDeg = scenario.environment.min_elevation_deg;
  const islRangeKm = scenario.environment.isl_range_km;
  const satEcef = new Map<string, Vec3>(snapshot.satellites.map((s) => [s.id, { x: s.x_km, y: s.y_km, z: s.z_km }]));

  const clientElevations = snapshot.elevation_deg[client.id] ?? [];
  const clientEcef = groundSiteEcef(client.lat_deg, client.lon_deg);
  let noVisibleSatellite = true;
  for (const entry of clientElevations) {
    if (!entry.visible) continue;
    noVisibleSatellite = false;
    const satPos = satEcef.get(entry.satellite_id);
    if (!satPos) continue;
    addUndirectedEdge(adjacency, client.id, entry.satellite_id, {
      distance_km: distanceKm(clientEcef, satPos),
      margin_ratio: marginRatio(entry.elevation_deg, minElevationDeg, 90),
    });
  }

  // ISL edges, straight from the snapshot's already-computed contact graph.
  for (const [a, b, dist] of snapshot.edges) {
    addUndirectedEdge(adjacency, a, b, { distance_km: dist, margin_ratio: marginRatio(islRangeKm - dist, 0, islRangeKm) });
  }

  const gateways = scenario.ground_sites.filter((s) => s.role === "gateway");
  const gatewayIds = new Set<string>();
  let hasGeometricGatewayContact = false;
  let anyGatewayDown = false;
  for (const gw of gateways) {
    const down = snapshot.gateway_down[gw.id] ?? false;
    if (down) anyGatewayDown = true;
    const gwEcef = groundSiteEcef(gw.lat_deg, gw.lon_deg);
    for (const entry of snapshot.elevation_deg[gw.id] ?? []) {
      if (!entry.visible) continue;
      hasGeometricGatewayContact = true;
      if (down) continue; // Geometrically in contact, but administratively unusable — no edge.
      const satPos = satEcef.get(entry.satellite_id);
      if (!satPos) continue;
      gatewayIds.add(gw.id);
      addUndirectedEdge(adjacency, entry.satellite_id, gw.id, {
        distance_km: distanceKm(satPos, gwEcef),
        margin_ratio: marginRatio(entry.elevation_deg, minElevationDeg, 90),
      });
    }
  }

  return {
    graph: { adjacency, clientId: client.id, gatewayIds },
    noVisibleSatellite,
    hasGeometricGatewayContact,
    anyGatewayDown,
  };
}
