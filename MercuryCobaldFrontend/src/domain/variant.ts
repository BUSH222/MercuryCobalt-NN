import type { Environment, LaunchStage, Plane, SatelliteFailure, Scenario } from "./scenario";
import type { SeriesMetrics } from "./metrics";

/** User-editable overrides layered on top of the originally loaded scenario. */
export interface ConfigOverrides {
  launch_stage: LaunchStage;
  /** Plane id -> partial override of raan_deg / phase_deg. */
  plane_overrides: Record<string, Pick<Plane, "raan_deg" | "phase_deg">>;
  /** Failures added by the user in this session, appended to the baseline failures. */
  added_failures: SatelliteFailure[];
  /**
   * Partial override of the scenario's `environment` block. Unlike the export
   * dialog's title/id fields (which only ever touch the downloaded file),
   * this is applied to the actual effective scenario via an explicit
   * "Применить изменения окружения" action, so it flows through the normal
   * "Запустить расчёт" cycle like every other override.
   */
  environment_overrides: Partial<Environment>;
  /**
   * Simulation start date ("YYYY-MM-DD", always 00:00 UTC) feeding the Sun
   * model — the terminator overlay and satellite eclipse detection. Doesn't
   * touch orbital mechanics (RAAN/phase/launch_stage are computed
   * independently of it) or `effective_scenario`, so changing it never
   * requires a recompute — but it does change the computed eclipse
   * failures, so it lives here (saved and diffed per variant) rather than as
   * a global UI preference like `earthModel`.
   */
  sim_date: string;
}

/** Summer solstice 2026 — maximum Sun declination, the most legible polar day/night demo. */
export const DEFAULT_SIM_DATE = "2026-06-22";

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
    environment_overrides: {},
    sim_date: DEFAULT_SIM_DATE,
  };
}
