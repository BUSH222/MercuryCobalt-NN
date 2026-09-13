/**
 * Widest path (maximum bottleneck): among every candidate route, picks the
 * one whose single weakest link has the largest safety margin, rather than
 * the shortest distance or the fewest hops — minimising the risk that a
 * small geometry drift or a brief signal dip breaks the route. Ground legs
 * are scored by spare elevation above `min_elevation_deg`, ISL legs by spare
 * range below `isl_range_km` (see `margins.ts` for the normalised formulas
 * that make the two comparable in one bottleneck).
 *
 * Same shape as `shortestDistanceRoute`: relax to completion over every
 * reachable satellite (maximising the running minimum instead of minimising
 * the running sum — the standard "maximum capacity path" variant of
 * Dijkstra), then pick the best usable-gateway satellite in a second pass
 * once its own gateway leg's margin is known too.
 */
import type { GroundSite, Scenario, Snapshot } from "../../domain";
import { buildRoute, emptyRoute, prepareRouteSearch, unwindPath, type RouteWithoutAlgorithm } from "./graph";
import { groundLegMargin, islLegMargin } from "./margins";

export function widestMarginRoute(scenario: Scenario, snapshot: Snapshot, client: GroundSite): RouteWithoutAlgorithm {
  const prep = prepareRouteSearch(scenario, snapshot, client);
  if (!prep.ok) return prep.route;
  const { clientVisible, adjacency, reachability } = prep;
  const { min_elevation_deg: minElevationDeg, isl_range_km: islRangeKm } = scenario.environment;

  const elevationTo = (siteId: string, satId: string): number | null =>
    (snapshot.elevation_deg[siteId] ?? []).find((e) => e.satellite_id === satId)?.elevation_deg ?? null;

  const bottleneck = new Map<string, number>();
  const predecessor = new Map<string, string | null>();
  const settled = new Set<string>();
  for (const satId of clientVisible) {
    const elevationDeg = elevationTo(client.id, satId);
    bottleneck.set(satId, elevationDeg === null ? -Infinity : groundLegMargin(elevationDeg, minElevationDeg));
    predecessor.set(satId, null);
  }

  for (;;) {
    let current: string | null = null;
    let currentBest = -Infinity;
    for (const [satId, margin] of bottleneck) {
      if (!settled.has(satId) && margin > currentBest) {
        current = satId;
        currentBest = margin;
      }
    }
    if (current === null) break;
    settled.add(current);
    for (const { to: next, distanceKm: legKm } of adjacency.get(current) ?? []) {
      if (settled.has(next)) continue;
      const candidate = Math.min(currentBest, islLegMargin(legKm, islRangeKm));
      if (candidate > (bottleneck.get(next) ?? -Infinity)) {
        bottleneck.set(next, candidate);
        predecessor.set(next, current);
      }
    }
  }

  let targetSat: string | null = null;
  let bestTotal = -Infinity;
  for (const [satId, gatewayId] of reachability.usableGateway) {
    const meshBest = bottleneck.get(satId);
    if (meshBest === undefined) continue;
    const gatewayElevationDeg = elevationTo(gatewayId, satId);
    if (gatewayElevationDeg === null) continue;
    const total = Math.min(meshBest, groundLegMargin(gatewayElevationDeg, minElevationDeg));
    if (total > bestTotal) {
      bestTotal = total;
      targetSat = satId;
    }
  }

  if (targetSat === null) return emptyRoute(snapshot, client, "isl_mesh_broken");
  return buildRoute(snapshot, client, unwindPath(predecessor, targetSat), reachability.usableGateway.get(targetSat)!);
}
