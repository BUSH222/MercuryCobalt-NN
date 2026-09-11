/**
 * Sample scenarios matching the four files described in "Описание данных"
 * (01_full_constellation, 02_first_launch, 03_satellite_outages, 04_link_range).
 * Used to seed the "Загрузить пример" action and for local development, since
 * no backend or original data files are available in this environment. The
 * shape follows the "cosmo-A-1.0" schema exactly so it is a drop-in stand-in
 * for a real uploaded scenario.
 */
import {
  SCENARIO_SCHEMA_VERSION,
  type GatewayOutage,
  type GroundSite,
  type LaunchBatch,
  type LaunchStage,
  type Plane,
  type Satellite,
  type SatelliteFailure,
  type Scenario,
} from "../domain";

const PLANES_COUNT = 3;
const SATS_PER_PLANE = 16;
const PLANE_RAAN_DEG = [15, 135, 255];
const PLANE_PHASE_DEG = [0, 7.5, 15];

function buildPlanes(): Plane[] {
  return Array.from({ length: PLANES_COUNT }, (_, i) => ({
    id: `P${i + 1}`,
    raan_deg: PLANE_RAAN_DEG[i]!,
    phase_deg: PLANE_PHASE_DEG[i]!,
  }));
}

function buildSatellites(): Satellite[] {
  const satellites: Satellite[] = [];
  let globalIndex = 0;
  for (let p = 0; p < PLANES_COUNT; p++) {
    for (let s = 0; s < SATS_PER_PLANE; s++) {
      const launchBatch = ((globalIndex % 3) + 1) as LaunchBatch;
      satellites.push({
        id: `SAT-P${p + 1}-${String(s + 1).padStart(2, "0")}`,
        plane_id: `P${p + 1}`,
        slot_deg: (s * 360) / SATS_PER_PLANE,
        launch_batch: launchBatch,
      });
      globalIndex++;
    }
  }
  return satellites;
}

function buildGroundSites(): GroundSite[] {
  return [
    { id: "GS-MUR", name: "Мурманск", role: "client", lat_deg: 68.97, lon_deg: 33.09 },
    { id: "GS-NOR", name: "Норильск", role: "client", lat_deg: 69.35, lon_deg: 88.21 },
    { id: "GS-TIK", name: "Тикси", role: "client", lat_deg: 71.64, lon_deg: 128.87 },
    { id: "GS-MOW", name: "Москва (шлюз)", role: "gateway", lat_deg: 55.75, lon_deg: 37.62 },
  ];
}

function baseScenario(overrides: {
  id: string;
  title: string;
  launch_stage: LaunchStage;
  isl_range_km: number;
  failures?: SatelliteFailure[];
  gateway_outages?: GatewayOutage[];
}): Scenario {
  return {
    schema_version: SCENARIO_SCHEMA_VERSION,
    meta: { id: overrides.id, title: overrides.title },
    environment: {
      altitude_km: 550,
      inclination_deg: 87,
      earth_angle0_deg: 0,
      horizon_s: 86400,
      step_s: 120,
      min_elevation_deg: 10,
      isl_range_km: overrides.isl_range_km,
      target_availability: 0.9,
    },
    design: {
      launch_stage: overrides.launch_stage,
      planes: buildPlanes(),
      satellites: buildSatellites(),
    },
    ground_sites: buildGroundSites(),
    failures: overrides.failures ?? [],
    gateway_outages: overrides.gateway_outages ?? [],
  };
}

export function fullConstellationScenario(): Scenario {
  return baseScenario({
    id: "01_full_constellation",
    title: "Полная группировка",
    launch_stage: 3,
    isl_range_km: 3000,
  });
}

export function firstLaunchScenario(): Scenario {
  return baseScenario({
    id: "02_first_launch",
    title: "Первая очередь запуска",
    launch_stage: 1,
    isl_range_km: 3000,
  });
}

export function satelliteOutagesScenario(): Scenario {
  const failedSatIds = [
    "SAT-P1-01", "SAT-P1-05", "SAT-P1-09", "SAT-P1-13",
    "SAT-P2-03", "SAT-P2-07", "SAT-P2-11", "SAT-P2-15",
    "SAT-P3-06", "SAT-P3-14",
  ];
  return baseScenario({
    id: "03_satellite_outages",
    title: "Недоступность десяти аппаратов",
    launch_stage: 3,
    isl_range_km: 3000,
    failures: failedSatIds.map((satellite_id) => ({ satellite_id, start_s: 21600, end_s: 86400 })),
  });
}

export function linkRangeScenario(): Scenario {
  return baseScenario({
    id: "04_link_range",
    title: "Дальность межспутниковой связи 2000 км",
    launch_stage: 3,
    isl_range_km: 2000,
  });
}

export const SAMPLE_SCENARIOS = [
  { label: "01. Полная группировка", build: fullConstellationScenario },
  { label: "02. Первая очередь запуска", build: firstLaunchScenario },
  { label: "03. Недоступность десяти аппаратов", build: satelliteOutagesScenario },
  { label: "04. Дальность ISL 2000 км", build: linkRangeScenario },
] as const;
