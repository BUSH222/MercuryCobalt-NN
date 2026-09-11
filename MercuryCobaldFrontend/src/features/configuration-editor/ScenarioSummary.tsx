import type { Scenario } from "../../domain";
import { formatDuration } from "../../utils/time";
import { classifyScenarioConditions } from "../../utils/scenarioClassification";
import styles from "./ScenarioSummary.module.css";

export function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  const clientCount = scenario.ground_sites.filter((s) => s.role === "client").length;
  const gatewayCount = scenario.ground_sites.filter((s) => s.role === "gateway").length;
  const conditions = classifyScenarioConditions(scenario);

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{scenario.meta.title}</div>
      <div className={styles.id}>{scenario.meta.id}</div>
      <span className={conditions.isNominal ? styles.conditionNominal : styles.conditionStress}>
        {conditions.isNominal ? "Штатный вариант" : conditions.labels.join(" · ")}
      </span>
      <div className={styles.grid}>
        <Stat label="Плоскостей" value={scenario.design.planes.length} />
        <Stat label="Спутников" value={scenario.design.satellites.length} />
        <Stat label="Клиентских пунктов" value={clientCount} />
        <Stat label="Шлюзов" value={gatewayCount} />
        <Stat label="Горизонт расчёта" value={formatDuration(scenario.environment.horizon_s, "hms")} />
        <Stat label="Шаг расчёта" value={`${scenario.environment.step_s} с`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
