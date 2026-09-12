/**
 * The advanced-mode visibility criterion, and the seam that plugs it into
 * the existing snapshot pipeline as a swap-in alternative rather than a
 * rewrite of `computeSnapshot` (basic mode's own visibility logic in
 * `utils/geometry.ts` is untouched by everything in this file).
 */
import type { GroundSite, Snapshot } from "../domain";
import { getCachedHorizonProfile } from "./horizonCache";

function lookupBlockingElevationDeg(profileStepDeg: number, blockingElevationDeg: number[], azimuthDeg: number): number {
  const normalizedAz = ((azimuthDeg % 360) + 360) % 360;
  const sampleCount = blockingElevationDeg.length;
  const rawIndex = normalizedAz / profileStepDeg;
  const i0 = Math.floor(rawIndex) % sampleCount;
  const i1 = (i0 + 1) % sampleCount;
  const frac = rawIndex - Math.floor(rawIndex);
  const v0 = blockingElevationDeg[i0]!;
  const v1 = blockingElevationDeg[i1]!;
  return v0 + (v1 - v0) * frac;
}

/**
 * `elevationDeg(satellite) > horizonProfile[azimuthDeg(satellite)]` — no
 * `min_elevation_deg` involved. Returns `false` (not `true`) if no profile is
 * cached yet for this site, since claiming visibility the app can't actually
 * back up would be worse than a temporarily-conservative "not visible" while
 * the fetch is still in flight (see `useAdvancedTerrainSync.ts`).
 */
export function isVisibleAdvanced(site: GroundSite, satelliteAzDeg: number, satelliteElDeg: number): boolean {
  const profile = getCachedHorizonProfile(site);
  if (!profile) return false;
  const blocking = lookupBlockingElevationDeg(profile.azimuthStepDeg, profile.blockingElevationDeg, satelliteAzDeg);
  return satelliteElDeg > blocking;
}

/**
 * Overrides `visible` in a snapshot's elevation entries using the terrain
 * horizon profile, for every ground site that has one cached — sites without
 * a ready profile yet keep whatever `computeSnapshot` (basic mode) already
 * computed for them, untouched. Returns a new `Snapshot`; never mutates the
 * one it was given.
 */
export function applyAdvancedVisibility(snapshot: Snapshot, groundSites: GroundSite[]): Snapshot {
  let changed = false;
  const elevation_deg = { ...snapshot.elevation_deg };
  for (const site of groundSites) {
    const profile = getCachedHorizonProfile(site);
    if (!profile) continue;
    const entries = elevation_deg[site.id];
    if (!entries) continue;
    changed = true;
    elevation_deg[site.id] = entries.map((entry) => ({
      ...entry,
      visible: isVisibleAdvanced(site, entry.azimuth_deg, entry.elevation_deg),
    }));
  }
  return changed ? { ...snapshot, elevation_deg } : snapshot;
}
