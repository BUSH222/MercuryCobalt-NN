/**
 * Karman-line proximity check for ISL segments on the currently displayed
 * route — a stricter, purely informational threshold layered on top of the
 * base ISL contact-possible check (`islContactPossible` in `geometry.ts`,
 * which only requires clearing the solid Earth, i.e. staying above radius
 * R). A contact can be geometrically valid yet still dip below R + 100 km at
 * its closest approach to Earth; that's worth flagging to an engineer
 * analysing robustness even though the link itself is not broken by it.
 *
 * Reuses `closestApproachAltitudeKm` (the same closest-point-to-center
 * projection `islContactPossible` already computes) rather than redoing the
 * vector algebra for a second, stricter threshold.
 */
import type { Route, Snapshot } from "../domain";
import { closestApproachAltitudeKm, type Vec3 } from "./geometry";

export const KARMAN_LINE_KM = 100;

export interface KarmanBreach {
  altitudeKm: number;
  /** How far below the Karman line the closest approach point is (positive when breached). */
  deficitKm: number;
}

/** Null means the segment stays at or above the Karman line — nothing to show. */
export function checkKarmanLine(a: Vec3, b: Vec3): KarmanBreach | null {
  const altitudeKm = closestApproachAltitudeKm(a, b);
  if (altitudeKm >= KARMAN_LINE_KM) return null;
  return { altitudeKm, deficitKm: KARMAN_LINE_KM - altitudeKm };
}

export interface RouteKarmanBreach extends KarmanBreach {
  fromId: string;
  toId: string;
}

/**
 * Checks every satellite-to-satellite (ISL) segment of the given route —
 * ground legs (client->satellite, satellite->gateway) are skipped entirely,
 * since the Karman line only means something for a segment with both ends in
 * space. Returns only the segments that actually breach the threshold, in
 * path order; an empty array means nothing to display.
 */
export function computeRouteKarmanBreaches(route: Route | null, snapshot: Snapshot | null): RouteKarmanBreach[] {
  if (!route || !snapshot || route.nodes.length < 2) return [];
  const positions = new Map<string, Vec3>(snapshot.satellites.map((s) => [s.id, { x: s.x_km, y: s.y_km, z: s.z_km }]));
  const breaches: RouteKarmanBreach[] = [];
  for (let i = 0; i < route.nodes.length - 1; i++) {
    const from = route.nodes[i]!;
    const to = route.nodes[i + 1]!;
    if (from.kind !== "satellite" || to.kind !== "satellite") continue;
    const a = positions.get(from.id);
    const b = positions.get(to.id);
    if (!a || !b) continue;
    const breach = checkKarmanLine(a, b);
    if (breach) breaches.push({ fromId: from.id, toId: to.id, ...breach });
  }
  return breaches;
}
