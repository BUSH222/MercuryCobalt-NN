import { Icon } from "../../components/common/Icon";
import { TimeScrubber } from "../../components/Timeline/TimeScrubber";
import { AvailabilityGantt } from "../../components/Timeline/AvailabilityGantt";
import { useScenarioStore } from "../../store/useScenarioStore";
import { useUiStore } from "../../store/useUiStore";
import { formatDuration } from "../../utils/time";
import styles from "./StatsView.module.css";

export function StatsView() {
  const scenario = useScenarioStore((s) => s.effectiveScenario);
  const series = useScenarioStore((s) => s.series);
  const timeIndex = useScenarioStore((s) => s.timeIndex);
  const setTimeIndex = useScenarioStore((s) => s.setTimeIndex);
  const timeUnit = useUiStore((s) => s.timeUnit);

  if (!scenario || !series) {
    return (
      <div className={styles.wrap} style={{ alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}>
        <Icon name="chart" size={28} />
        <span>Нет данных для отображения. Загрузите сценарий и выполните расчёт.</span>
      </div>
    );
  }

  const clients = scenario.ground_sites.filter((g) => g.role === "client");
  const targetPct = series.metrics.target_availability * 100;

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        {series.metrics.per_client.map((m) => {
          const site = clients.find((c) => c.id === m.client_id);
          const availPct = m.availability_fraction * 100;
          const passes = availPct >= targetPct;
          return (
            <div className={styles.card} key={m.client_id}>
              <span className={styles.cardTitle}>{site?.name ?? m.client_id}</span>
              <div className={styles.metricRow}>
                <span>Видимость спутника</span>
                <span className={styles.metricValue}>{(m.visibility_fraction * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.metricRow}>
                <span>Доступность связи</span>
                <span className={`${styles.metricValue} ${passes ? styles.pass : styles.fail}`}>
                  {availPct.toFixed(1)}% (цель {targetPct.toFixed(0)}%)
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>Макс. перерыв</span>
                <span className={styles.metricValue}>{formatDuration(m.max_outage_s, timeUnit)}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Переходов маршрута</span>
                <span className={styles.metricValue}>
                  {m.min_hop_count === null ? "—" : `${m.min_hop_count}–${m.max_hop_count}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Диаграмма доступности и отказов</span>
        <AvailabilityGantt
          horizonS={scenario.environment.horizon_s}
          clients={clients}
          routesByClient={series.routes_by_client}
          failures={scenario.failures}
          gatewayOutages={scenario.gateway_outages}
          timeIndex={timeIndex}
          stepCount={series.t_grid_s.length}
          onSeek={setTimeIndex}
        />
      </div>

      <TimeScrubber tGrid={series.t_grid_s} timeIndex={timeIndex} onChange={setTimeIndex} timeUnit={timeUnit} />
    </div>
  );
}
