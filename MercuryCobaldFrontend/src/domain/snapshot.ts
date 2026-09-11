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
  /** elevation_deg >= environment.min_elevation_deg */
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
