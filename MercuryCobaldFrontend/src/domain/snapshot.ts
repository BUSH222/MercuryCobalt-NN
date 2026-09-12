/**
 * Types for the state of the network at a single computation instant, mirroring
 * the shape produced by `snapshot(scenario, t_s)` in the reference geometry
 * module (satellites with x_km/y_km/z_km + active, edges as [id_1, id_2,
 * distance_km], elevation_deg per ground site).
 */

export interface SatelliteState {
  id: string;
  x_km: number;
  y_km: number;
  z_km: number;
  /** Derived subpoint (ground track), used for map projection. */
  lat_deg: number;
  lon_deg: number;
  active: boolean;
}

/** An inter-satellite link edge present at this instant: [id_1, id_2, distance_km]. */
export type IslEdge = [id_1: string, id_2: string, distance_km: number];

export interface ElevationEntry {
  satellite_id: string;
  elevation_deg: number;
  /** 0 = North, clockwise through 90 = East. Only consumer today is advanced-mode's horizon-profile lookup. */
  azimuth_deg: number;
  /**
   * Basic mode: `elevation_deg >= environment.min_elevation_deg`. Advanced
   * mode overrides this per ground site from the terrain horizon profile
   * instead (see `terrain/applyAdvancedVisibility.ts`) — `min_elevation_deg`
   * plays no part in that path at all.
   */
  visible: boolean;
}

export interface Snapshot {
  t_s: number;
  satellites: SatelliteState[];
  edges: IslEdge[];
  /** Ground site id -> elevation entries towards every active satellite. */
  elevation_deg: Record<string, ElevationEntry[]>;
  /** Ground site id -> whether the site's gateway/client link is administratively down. */
  gateway_down: Record<string, boolean>;
}
