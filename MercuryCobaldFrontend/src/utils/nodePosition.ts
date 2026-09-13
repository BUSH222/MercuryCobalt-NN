/**
 * Looks up the ECEF position of any node id that can appear in a route path —
 * a satellite (from the snapshot) or a ground site (client/gateway, from the
 * scenario) — at the instant the snapshot represents. Shared by
 * `linkMetrics.ts` (distance/RTT for an already-built route) and
 * `utils/routing/` (distance-weighted pathfinding), so the two never risk
 * computing a hop's length two different ways.
 */
import type { Scenario, Snapshot } from "../domain";
import { groundSiteEcef, type Vec3 } from "./geometry";

export function nodePosition(id: string, scenario: Scenario, snapshot: Snapshot): Vec3 | null {
  const sat = snapshot.satellites.find((s) => s.id === id);
  if (sat) return { x: sat.x_km, y: sat.y_km, z: sat.z_km };
  const site = scenario.ground_sites.find((s) => s.id === id);
  if (site) return groundSiteEcef(site.lat_deg, site.lon_deg);
  return null;
}

export function distanceKm(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
