import type { LaunchStage, Plane, SatelliteFailure, Scenario } from "./scenario";
import type { SeriesMetrics } from "./metrics";

/** User-editable overrides layered on top of the originally loaded scenario. */
export interface ConfigOverrides {
  launch_stage: LaunchStage;
  /** Plane id -> partial override of raan_deg / phase_deg. */
  plane_overrides: Record<string, Pick<Plane, "raan_deg" | "phase_deg">>;
  /** Failures added by the user in this session, appended to the baseline failures. */
  added_failures: SatelliteFailure[];
}

/** A saved, named configuration + its computed metrics, kept for comparison. */
export interface SavedVariant {
  id: string;
  name: string;
  created_at: string;
  overrides: ConfigOverrides;
  effective_scenario: Scenario;
  metrics: SeriesMetrics;
}

export function createDefaultOverrides(launchStage: LaunchStage): ConfigOverrides {
  return {
    launch_stage: launchStage,
    plane_overrides: {},
    added_failures: [],
  };
}
