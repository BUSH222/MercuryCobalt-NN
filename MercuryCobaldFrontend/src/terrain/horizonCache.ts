/**
 * Per-site horizon profile cache. Terrain is static for the lifetime of a
 * scenario, so a profile is fetched+computed once and reused for every
 * timestep — this module is the "once" part; callers (see
 * `useAdvancedTerrainSync.ts`) decide *when* to warm it.
 */
import type { GroundSite } from "../domain";
import { fetchTerrainGrid } from "./terrainApi";
import type { HorizonProfile } from "./types";

const cache = new Map<string, HorizonProfile>();
const inFlight = new Map<string, Promise<HorizonProfile>>();

// Includes rounded coordinates (not just the site id) so a scenario that
// reuses an id with different coordinates can't accidentally serve a stale
// profile computed for a different location.
function cacheKey(site: GroundSite): string {
  return `${site.id}@${site.lat_deg.toFixed(4)},${site.lon_deg.toFixed(4)}`;
}

/** Fetches + computes the profile if needed (deduping concurrent calls for the same site), or returns the cached one. */
export async function getHorizonProfile(site: GroundSite): Promise<HorizonProfile> {
  const key = cacheKey(site);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const grid = await fetchTerrainGrid(site.lat_deg, site.lon_deg);
    // Dynamically imported so `three` (sizeable) only ever loads for users who
    // actually switch to advanced mode — everyone else's bundle stays as it
    // was. Same lazy-chunk pattern the 3D globe view already uses.
    const { computeHorizonProfile } = await import("./horizonProfile");
    return computeHorizonProfile(site.id, grid);
  })();
  inFlight.set(key, promise);
  try {
    const profile = await promise;
    cache.set(key, profile);
    return profile;
  } finally {
    inFlight.delete(key);
  }
}

/** Synchronous lookup for the compute pipeline — null means "not warmed yet", handled by falling back to basic-mode visibility for that site. */
export function getCachedHorizonProfile(site: GroundSite): HorizonProfile | null {
  return cache.get(cacheKey(site)) ?? null;
}
