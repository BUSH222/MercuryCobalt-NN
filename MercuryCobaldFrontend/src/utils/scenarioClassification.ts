import type { Scenario } from "../domain";

/**
 * Per the Q&A clarification: files like the reduced ISL range or the injected
 * satellite outages are stress-test scenarios for resilience analysis, not
 * alternative "nominal" operating configurations — comparisons should label
 * them so it stays clear when two conditions being compared aren't the same
 * class of scenario. 3000 km is the "base" range named in the brief.
 */
const NOMINAL_ISL_RANGE_KM = 3000;

export interface ScenarioConditionFlags {
  isNominal: boolean;
  labels: string[];
}

export function classifyScenarioConditions(scenario: Scenario): ScenarioConditionFlags {
  const labels: string[] = [];
  if (scenario.design.launch_stage < 3) {
    labels.push(`Неполное развёртывание (очередь ${scenario.design.launch_stage})`);
  }
  if (scenario.failures.length > 0) {
    labels.push(`Отказы спутников (${scenario.failures.length})`);
  }
  if (scenario.gateway_outages.length > 0) {
    labels.push(`Недоступность шлюза (${scenario.gateway_outages.length})`);
  }
  if (scenario.environment.isl_range_km !== NOMINAL_ISL_RANGE_KM) {
    labels.push(`Дальность ISL ${scenario.environment.isl_range_km} км`);
  }
  return { isNominal: labels.length === 0, labels };
}
