/**
 * Domain types for a constellation scenario, mirroring the "cosmo-A-1.0" schema
 * described in "Описание данных" (schema_version, meta, environment, design,
 * ground_sites, failures, gateway_outages).
 */

export const SCENARIO_SCHEMA_VERSION = "cosmo-A-1.0";
export const RESULT_SCHEMA_VERSION = "cosmo-A-result-1.0";

export type LaunchStage = 1 | 2 | 3;
export type LaunchBatch = 1 | 2 | 3;

export interface ScenarioMeta {
  id: string;
  title: string;
}

export interface Environment {
  altitude_km: number;
  inclination_deg: number;
  earth_angle0_deg: number;
  horizon_s: number;
  step_s: number;
  min_elevation_deg: number;
  isl_range_km: number;
  target_availability: number;
}

export interface Plane {
  id: string;
  raan_deg: number;
  phase_deg: number;
}

export interface Satellite {
  id: string;
  plane_id: string;
  slot_deg: number;
  launch_batch: LaunchBatch;
}

export interface Design {
  launch_stage: LaunchStage;
  planes: Plane[];
  satellites: Satellite[];
}

export type GroundSiteRole = "client" | "gateway";

export interface GroundSite {
  id: string;
  name: string;
  role: GroundSiteRole;
  lat_deg: number;
  lon_deg: number;
}

export interface SatelliteFailure {
  satellite_id: string;
  start_s: number;
  end_s: number;
}

export interface GatewayOutage {
  gateway_id: string;
  start_s: number;
  end_s: number;
}

export interface Scenario {
  schema_version: typeof SCENARIO_SCHEMA_VERSION;
  meta: ScenarioMeta;
  environment: Environment;
  design: Design;
  ground_sites: GroundSite[];
  failures: SatelliteFailure[];
  gateway_outages: GatewayOutage[];
}
