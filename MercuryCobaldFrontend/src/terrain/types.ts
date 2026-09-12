/**
 * Types for the "Advanced (terrain, WGS84)" earth model. Kept in this module
 * rather than `domain/` — unlike `Scenario`/`Snapshot`, none of this is part
 * of the "cosmo-A-1.0" schema or ever leaves the browser; it's local,
 * derived, computational state for one alternative visibility path.
 */

export interface TerrainBounds {
  south_deg: number;
  north_deg: number;
  west_deg: number;
  east_deg: number;
}

/** Mirrors the backend's `TerrainGrid` response shape (see `terrain_api/schemas.py`). */
export interface TerrainGrid {
  lat_deg: number;
  lon_deg: number;
  demtype: string;
  bounds: TerrainBounds;
  rows: number;
  cols: number;
  /** Row-major, meters. Row 0 = bounds.north_deg, col 0 = bounds.west_deg. */
  elevations_m: number[][];
  cached: boolean;
}

export interface TerrainApiError {
  error: string;
  message: string;
}

/**
 * The silhouette of the terrain surrounding a ground site, as seen from that
 * site: for each sampled azimuth, the highest elevation angle still blocked
 * by terrain. Visibility in advanced mode is `elevationDeg(sat) >
 * blockingElevationDeg(azimuthDeg(sat))` — no `min_elevation_deg` involved.
 */
export interface HorizonProfile {
  siteId: string;
  /** Degrees between consecutive samples, e.g. 5 for 72 samples around the full circle. */
  azimuthStepDeg: number;
  /** blockingElevationDeg[i] is the horizon angle at azimuth i * azimuthStepDeg. */
  blockingElevationDeg: number[];
}
