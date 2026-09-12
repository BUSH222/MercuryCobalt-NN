/**
 * Derives per-instant link-quality/robustness figures from an already-computed
 * `Route`, without touching routing itself. Keeping this as a layer on top of
 * `utils/routing.ts` (rather than folding it into the BFS) is the split asked
 * for: topology stays pure, physics/quality/robustness are a pure function of
 * (scenario, snapshot, route).
 */
import type { ClientLinkSample, GroundSite, LinkAssumptions, LinkStatus, Route, Scenario, Snapshot } from "../domain";
import { groundSiteEcef, type Vec3 } from "./geometry";

const SPEED_OF_LIGHT_KM_S = 299792.458;

function nodePosition(id: string, scenario: Scenario, snapshot: Snapshot): Vec3 | null {
  const sat = snapshot.satellites.find((s) => s.id === id);
  if (sat) return { x: sat.x_km, y: sat.y_km, z: sat.z_km };
  const site = scenario.ground_sites.find((s) => s.id === id);
  if (site) return groundSiteEcef(site.lat_deg, site.lon_deg);
  return null;
}

function distanceKm(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Standard free-space path loss: FSPL(dB) = 20log10(d_km) + 20log10(f_GHz) + 92.45. */
function fsplDb(distanceKmValue: number, frequencyGhz: number): number {
  return 20 * Math.log10(distanceKmValue) + 20 * Math.log10(frequencyGhz) + 92.45;
}

export function computeLinkSample(
  scenario: Scenario,
  snapshot: Snapshot,
  route: Route,
  client: GroundSite,
  assumptions: LinkAssumptions,
): ClientLinkSample {
  const connected = route.path.length > 0;

  const hopDistances: number[] = [];
  if (connected) {
    for (let i = 0; i < route.path.length - 1; i++) {
      const a = nodePosition(route.path[i]!, scenario, snapshot);
      const b = nodePosition(route.path[i + 1]!, scenario, snapshot);
      if (a && b) hopDistances.push(distanceKm(a, b));
    }
  }

  const totalDistanceKm = connected && hopDistances.length > 0 ? hopDistances.reduce((s, d) => s + d, 0) : null;
  const oneWayLatencyMs = totalDistanceKm !== null ? (totalDistanceKm / SPEED_OF_LIGHT_KM_S) * 1000 : null;
  const roundTripLatencyMs = oneWayLatencyMs !== null ? oneWayLatencyMs * 2 : null;

  const hopCount = route.hop_count;
  // One-way total switching delay across every hop in the path.
  const processingDelayMs = hopCount !== null ? hopCount * assumptions.per_hop_processing_delay_ms : null;
  // RTT = pure-physics round trip + processing delay incurred in both directions.
  const totalRttMs =
    roundTripLatencyMs !== null && processingDelayMs !== null ? roundTripLatencyMs + 2 * processingDelayMs : null;

  const relaySatelliteCount = connected ? Math.max(route.path.length - 2, 0) : null;
  const usesIsl = relaySatelliteCount !== null && relaySatelliteCount > 1;
  const firstHopSatellite = connected && route.path.length >= 2 ? route.path[1]! : null;
  const lastHopSatellite = connected && route.path.length >= 2 ? route.path[route.path.length - 2]! : null;

  const clientElevations = snapshot.elevation_deg[client.id] ?? [];
  const visibleSatelliteCount = clientElevations.filter((e) => e.visible).length;

  const firstHopElevationDeg =
    firstHopSatellite !== null
      ? (clientElevations.find((e) => e.satellite_id === firstHopSatellite)?.elevation_deg ?? null)
      : null;
  const lastHopElevationDeg =
    lastHopSatellite !== null && route.gateway_id
      ? ((snapshot.elevation_deg[route.gateway_id] ?? []).find((e) => e.satellite_id === lastHopSatellite)
          ?.elevation_deg ?? null)
      : null;

  const maxHopKm = hopDistances.length > 0 ? Math.max(...hopDistances) : null;
  const minHopKm = hopDistances.length > 0 ? Math.min(...hopDistances) : null;
  const avgHopKm = hopDistances.length > 0 ? hopDistances.reduce((s, d) => s + d, 0) / hopDistances.length : null;
  const fsplDbBottleneck = maxHopKm !== null ? fsplDb(maxHopKm, assumptions.frequency_ghz) : null;

  const elevationMarginDeg = (() => {
    const candidates = [firstHopElevationDeg, lastHopElevationDeg].filter((v): v is number => v !== null);
    if (candidates.length === 0) return null;
    return Math.min(...candidates) - scenario.environment.min_elevation_deg;
  })();

  const altDisjointPathsEstimate = connected ? Math.max(visibleSatelliteCount - 1, 0) : 0;

  let status: LinkStatus;
  if (!connected) {
    status = "outage";
  } else if (
    (elevationMarginDeg !== null && elevationMarginDeg < assumptions.degraded_elevation_margin_deg) ||
    (totalRttMs !== null && totalRttMs > assumptions.degraded_rtt_ms)
  ) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  const servingSat = firstHopSatellite ? snapshot.satellites.find((s) => s.id === firstHopSatellite) : undefined;

  return {
    t_s: snapshot.t_s,
    client_id: client.id,
    connected,
    gateway_id: route.gateway_id,
    path: route.path,
    hop_count: hopCount,
    relay_satellite_count: relaySatelliteCount,
    uses_isl: usesIsl,
    first_hop_satellite: firstHopSatellite,
    last_hop_satellite: lastHopSatellite,
    total_distance_km: totalDistanceKm,
    one_way_latency_ms: oneWayLatencyMs,
    round_trip_latency_ms: roundTripLatencyMs,
    processing_delay_ms: processingDelayMs,
    total_rtt_ms: totalRttMs,
    max_hop_km: maxHopKm,
    min_hop_km: minHopKm,
    avg_hop_km: avgHopKm,
    first_hop_elevation_deg: firstHopElevationDeg,
    last_hop_elevation_deg: lastHopElevationDeg,
    fspl_db_bottleneck: fsplDbBottleneck,
    visible_satellite_count: visibleSatelliteCount,
    alt_disjoint_paths_estimate: altDisjointPathsEstimate,
    elevation_margin_deg: elevationMarginDeg,
    status,
    serving_satellite_subpoint: servingSat ? { lat_deg: servingSat.lat_deg, lon_deg: servingSat.lon_deg } : null,
    time_since_last_handover_s: null,
  };
}

/**
 * Second pass over an ordered per-client sample series: fills in how long the
 * current serving satellite (first hop) has been serving this client. The
 * first connection after a gap counts as a handover at that instant.
 */
export function fillHandoverTiming(samples: ClientLinkSample[]): void {
  let lastHandoverT: number | null = null;
  let lastServingSat: string | null = null;
  for (const sample of samples) {
    if (!sample.connected) {
      lastServingSat = null;
      sample.time_since_last_handover_s = null;
      continue;
    }
    if (sample.first_hop_satellite !== lastServingSat) {
      lastHandoverT = sample.t_s;
      lastServingSat = sample.first_hop_satellite;
    }
    sample.time_since_last_handover_s = lastHandoverT !== null ? sample.t_s - lastHandoverT : 0;
  }
}
