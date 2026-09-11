/**
 * Client-side port of the orbital / contact geometry formulas from
 * "Описание данных" (circular orbits, spherical Earth). Used to turn a
 * scenario into a Snapshot at any instant t_s without a backend.
 */
import type {
  ElevationEntry,
  Environment,
  GroundSite,
  IslEdge,
  Plane,
  Satellite,
  Scenario,
  SatelliteState,
  Snapshot,
} from "../domain";

const EARTH_RADIUS_KM = 6371;
const MU_KM3_S2 = 398600.435507;
const EARTH_ROTATION_PERIOD_S = 86164.09054;

const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
const rad2deg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function vsub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function vadd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function vscale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function vdot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function vnorm(a: Vec3): number {
  return Math.sqrt(vdot(a, a));
}

/** Plane augmented with the shared constellation inclination, for satelliteEci(). */
export type PlaneWithInclination = Plane & { inclination_deg: number };

/** Satellite position in the inertial frame at time t_s (x, y, z in km). */
export function satelliteEci(plane: PlaneWithInclination, sat: Satellite, altitudeKm: number, tS: number): Vec3 {
  const r = EARTH_RADIUS_KM + altitudeKm;
  const n = Math.sqrt(MU_KM3_S2 / (r * r * r));
  const u = deg2rad(sat.slot_deg + plane.phase_deg) + n * tS;
  const omega = deg2rad(plane.raan_deg);
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const cosO = Math.cos(omega);
  const sinO = Math.sin(omega);
  // inclination is shared across the constellation (environment.inclination_deg)
  const inc = deg2rad(plane.inclination_deg);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);
  return {
    x: r * (cosO * cosU - sinO * sinU * cosI),
    y: r * (sinO * cosU + cosO * sinU * cosI),
    z: r * sinU * sinI,
  };
}

/** Rotates an inertial-frame position into the Earth-fixed (ECEF) frame at time t_s. */
export function eciToEcef(pos: Vec3, earthAngle0Deg: number, tS: number): Vec3 {
  const theta = deg2rad(earthAngle0Deg) + (2 * Math.PI * tS) / EARTH_ROTATION_PERIOD_S;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  return {
    x: cosT * pos.x + sinT * pos.y,
    y: -sinT * pos.x + cosT * pos.y,
    z: pos.z,
  };
}

/** Ground-track subpoint (lat/lon in degrees) of an Earth-fixed position. */
export function ecefToLatLon(pos: Vec3): { lat_deg: number; lon_deg: number } {
  const norm = vnorm(pos);
  return {
    lat_deg: rad2deg(Math.asin(clamp(pos.z / norm, -1, 1))),
    lon_deg: rad2deg(Math.atan2(pos.y, pos.x)),
  };
}

/** Earth-fixed position of a ground site given its latitude/longitude in degrees. */
export function groundSiteEcef(latDeg: number, lonDeg: number): Vec3 {
  const phi = deg2rad(latDeg);
  const lambda = deg2rad(lonDeg);
  return {
    x: EARTH_RADIUS_KM * Math.cos(phi) * Math.cos(lambda),
    y: EARTH_RADIUS_KM * Math.cos(phi) * Math.sin(lambda),
    z: EARTH_RADIUS_KM * Math.sin(phi),
  };
}

/** Elevation angle (degrees) of a satellite as seen from a ground site position. */
export function elevationDeg(satEcef: Vec3, groundEcef: Vec3): number {
  const diff = vsub(satEcef, groundEcef);
  const diffNorm = vnorm(diff);
  if (diffNorm === 0) return 90;
  const value = vdot(diff, groundEcef) / (diffNorm * EARTH_RADIUS_KM);
  return rad2deg(Math.asin(clamp(value, -1, 1)));
}

/** Whether an inter-satellite link is geometrically possible between two active satellites. */
export function islContactPossible(a: Vec3, b: Vec3, islRangeKm: number): boolean {
  const d = vsub(b, a);
  const dist = vnorm(d);
  if (dist >= islRangeKm) return false;
  const dd = vdot(d, d);
  const q = dd === 0 ? 0 : clamp(-vdot(a, d) / dd, 0, 1);
  const closest = vadd(a, vscale(d, q));
  const distCenterToSegment = vnorm(closest);
  return distCenterToSegment > EARTH_RADIUS_KM;
}

export function isSatelliteActive(
  scenario: Scenario,
  sat: Satellite,
  tS: number,
): boolean {
  if (sat.launch_batch > scenario.design.launch_stage) return false;
  for (const f of scenario.failures) {
    if (f.satellite_id === sat.id && tS >= f.start_s && tS < f.end_s) return false;
  }
  return true;
}

export function isGatewayDown(scenario: Scenario, gatewaySite: GroundSite, tS: number): boolean {
  for (const o of scenario.gateway_outages) {
    if (o.gateway_id === gatewaySite.id && tS >= o.start_s && tS < o.end_s) return true;
  }
  return false;
}

function planeById(scenario: Scenario): Map<string, PlaneWithInclination> {
  const map = new Map<string, PlaneWithInclination>();
  for (const p of scenario.design.planes) {
    map.set(p.id, { ...p, inclination_deg: scenario.environment.inclination_deg });
  }
  return map;
}

/**
 * Computes the full network state at instant t_s: satellite positions/activity,
 * ISL edges, and ground-site elevation angles — the client-side equivalent of
 * `snapshot(scenario, t_s)` from the reference geometry module.
 */
export function computeSnapshot(scenario: Scenario, tS: number): Snapshot {
  const env: Environment = scenario.environment;
  const planes = planeById(scenario);

  const satellites: SatelliteState[] = [];
  const activeEcef = new Map<string, Vec3>();

  for (const sat of scenario.design.satellites) {
    const plane = planes.get(sat.plane_id);
    if (!plane) continue;
    const eci = satelliteEci(plane, sat, env.altitude_km, tS);
    const ecef = eciToEcef(eci, env.earth_angle0_deg, tS);
    const { lat_deg, lon_deg } = ecefToLatLon(ecef);
    const active = isSatelliteActive(scenario, sat, tS);
    satellites.push({ id: sat.id, x_km: ecef.x, y_km: ecef.y, z_km: ecef.z, lat_deg, lon_deg, active });
    if (active) activeEcef.set(sat.id, ecef);
  }

  const edges: IslEdge[] = [];
  const activeIds = [...activeEcef.keys()];
  for (let i = 0; i < activeIds.length; i++) {
    for (let j = i + 1; j < activeIds.length; j++) {
      const idA = activeIds[i]!;
      const idB = activeIds[j]!;
      const a = activeEcef.get(idA)!;
      const b = activeEcef.get(idB)!;
      if (islContactPossible(a, b, env.isl_range_km)) {
        edges.push([idA, idB, vnorm(vsub(b, a))]);
      }
    }
  }

  const elevation_deg: Record<string, ElevationEntry[]> = {};
  for (const site of scenario.ground_sites) {
    const g = groundSiteEcef(site.lat_deg, site.lon_deg);
    const entries: ElevationEntry[] = [];
    for (const [satId, satEcef] of activeEcef) {
      const el = elevationDeg(satEcef, g);
      entries.push({ satellite_id: satId, elevation_deg: el, visible: el >= env.min_elevation_deg });
    }
    elevation_deg[site.id] = entries;
  }

  const gateway_down: Record<string, boolean> = {};
  for (const site of scenario.ground_sites) {
    gateway_down[site.id] = site.role === "gateway" ? isGatewayDown(scenario, site, tS) : false;
  }

  return { t_s: tS, satellites, edges, elevation_deg, gateway_down };
}

/** The computation time grid: 0, step_s, 2*step_s, ..., up to but excluding horizon_s. */
export function timeGrid(env: Environment): number[] {
  const steps = Math.floor(env.horizon_s / env.step_s);
  const grid: number[] = [];
  for (let k = 0; k < steps; k++) grid.push(k * env.step_s);
  return grid;
}
