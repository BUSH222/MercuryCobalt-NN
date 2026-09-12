/**
 * Sun-direction model shared by the terminator overlay (map view) and
 * satellite eclipse detection (auto shadow-failures). Both need to agree on
 * exactly where the Sun is, so there is a single fixed inertial-frame
 * direction (`sunDirectionEci`) derived once from the simulation date, and
 * everything else — the subsolar point at a given instant, whether a lat/lon
 * point or a satellite is in shadow — rotates or projects that same vector.
 *
 * The one deliberate simplification: `sunDirectionEci` is treated as constant
 * across the whole horizon (a day). Earth's actual orbital motion shifts the
 * true Sun direction by under 1° per day, which doesn't matter for a
 * demonstration model — what matters is that the terminator and the eclipse
 * test never disagree with each other, which a single shared vector
 * guarantees by construction.
 */
import type { Vec3 } from "./geometry";
import { EARTH_RADIUS_KM, ecefToEci, eciToEcef } from "./geometry";

const deg2rad = (deg: number): number => (deg * Math.PI) / 180;

/** Day-of-year in UTC (Jan 1 = 1), ignoring time-of-day — matches the declination formula's convention. */
export function dayOfYearUtc(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const startOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((startOfDay - startOfYear) / 86_400_000) + 1;
}

/** Standard demo-grade approximation of the Sun's declination (degrees) — no ephemerides needed. */
export function solarDeclinationDeg(dayOfYear: number): number {
  return -23.44 * Math.cos(deg2rad((360 / 365) * (dayOfYear + 10)));
}

function normalizeLonDeg(lonDeg: number): number {
  let lon = lonDeg % 360;
  if (lon >= 180) lon -= 360;
  if (lon < -180) lon += 360;
  return lon;
}

/** Subsolar point (Earth-fixed lat/lon, degrees) at the instant `date` represents. */
export function subsolarPointEcef(date: Date): { lat_deg: number; lon_deg: number } {
  const lat_deg = solarDeclinationDeg(dayOfYearUtc(date));
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lon_deg = normalizeLonDeg((12 - utcHour) * 15);
  return { lat_deg, lon_deg };
}

function unitVectorFromLatLon(latDeg: number, lonDeg: number): Vec3 {
  const phi = deg2rad(latDeg);
  const lambda = deg2rad(lonDeg);
  return { x: Math.cos(phi) * Math.cos(lambda), y: Math.cos(phi) * Math.sin(lambda), z: Math.sin(phi) };
}

/**
 * The fixed inertial-frame Sun direction for the whole horizon, from the
 * simulation start date (a "YYYY-MM-DD" string, always taken at 00:00 UTC —
 * see the settings panel's date picker). This is the one function that
 * should be called to derive the Sun's direction; every other function here
 * takes its result (or the Earth-fixed direction rotated from it) as input.
 */
export function sunDirectionEci(simDateYmd: string, earthAngle0Deg: number): Vec3 {
  const date = new Date(`${simDateYmd}T00:00:00Z`);
  const subsolar = subsolarPointEcef(date);
  const uEcef0 = unitVectorFromLatLon(subsolar.lat_deg, subsolar.lon_deg);
  return ecefToEci(uEcef0, earthAngle0Deg, 0);
}

/** Rotates the fixed inertial Sun direction into the Earth-fixed frame at time t_s — same θ(t) as satellite positions. */
export function sunDirectionEcefAt(uEci: Vec3, earthAngle0Deg: number, tS: number): Vec3 {
  return eciToEcef(uEci, earthAngle0Deg, tS);
}

/**
 * Whether a satellite at Earth-fixed position `satEcef` (km) sits in Earth's
 * shadow, given the Sun's Earth-fixed direction at that same instant.
 * Cylindrical shadow model (no penumbra/refraction) — evaluating it with both
 * vectors in the Earth-fixed frame at a shared instant is equivalent to the
 * inertial-frame test (`along`/`crossDist` are dot products and norms, both
 * preserved by the same rotation applied to both vectors), so this reuses
 * each snapshot's already-computed Earth-fixed satellite position instead of
 * needing to carry inertial-frame coordinates through the pipeline.
 */
export function isEclipsed(sunEcef: Vec3, satEcef: Vec3): boolean {
  const along = satEcef.x * sunEcef.x + satEcef.y * sunEcef.y + satEcef.z * sunEcef.z;
  if (along >= 0) return false;
  const r2 = satEcef.x * satEcef.x + satEcef.y * satEcef.y + satEcef.z * satEcef.z;
  const crossDist = Math.sqrt(Math.max(0, r2 - along * along));
  return crossDist < EARTH_RADIUS_KM;
}
