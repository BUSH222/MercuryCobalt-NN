/**
 * Merges user-made configuration overrides (launch stage, per-plane RAAN/phase,
 * added failures) onto the originally loaded scenario, producing the
 * "effective scenario" that every computation and export operates on. Keeping
 * this as a pure function means undo ("Сбросить") is simply dropping the
 * overrides object.
 */
import type { ConfigOverrides, Scenario } from "../domain";

export function buildEffectiveScenario(baseline: Scenario, overrides: ConfigOverrides): Scenario {
  return {
    ...baseline,
    design: {
      ...baseline.design,
      launch_stage: overrides.launch_stage,
      planes: baseline.design.planes.map((plane) => {
        const override = overrides.plane_overrides[plane.id];
        return override ? { ...plane, ...override } : plane;
      }),
    },
    failures: [...baseline.failures, ...overrides.added_failures],
  };
}
