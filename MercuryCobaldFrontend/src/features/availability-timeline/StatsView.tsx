import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { Chip } from "../../components/common/Chip";
import { TimeScrubber } from "../../components/Timeline/TimeScrubber";
import { AvailabilityGantt } from "../../components/Timeline/AvailabilityGantt";
import { useScenarioStore } from "../../store/useScenarioStore";
import { useUiStore } from "../../store/useUiStore";
import { formatDuration } from "../../utils/time";
import styles from "./StatsView.module.css";

/** How many of the busiest satellites (by total serving-hop count) to surface. */
const TOP_SATELLITES_SHOWN = 5;

export function StatsView() {
  const scenario = useScenarioStore((s) => s.effectiveScenario);
  const series = useScenarioStore((s) => s.series);
  const timeIndex = useScenarioStore((s) => s.timeIndex);
  const setTimeIndex = useScenarioStore((s) => s.setTimeIndex);
  const timeUnit = useUiStore((s) => s.timeUnit);
  const togglePanel = useUiStore((s) => s.togglePanel);

  const constellation = useMemo(() => {
    if (!series || series.constellation_steps.length === 0) return null;
    const steps = series.constellation_steps;
    const meanVisibleSeries = steps.map((s) => s.mean_visible_satellites);
    const overallMeanVisible = meanVisibleSeries.reduce((a, b) => a + b, 0) / meanVisibleSeries.length;
    const minVisible = Math.min(...meanVisibleSeries);
    const maxVisible = Math.max(...meanVisibleSeries);

    const totalLoad = new Map<string, number>();
    for (const step of steps) {
      for (const [satId, count] of Object.entries(step.satellite_load)) {
        totalLoad.set(satId, (totalLoad.get(satId) ?? 0) + count);
      }
    }
    const topSatellites = [...totalLoad.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_SATELLITES_SHOWN);
    const maxLoad = topSatellites.length > 0 ? topSatellites[0]![1] : 1;

    return { overallMeanVisible, minVisible, maxVisible, topSatellites, maxLoad };
  }, [series]);

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
          const passes = m.meets_target_availability;
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
                <span>Суммарный простой</span>
                <span className={styles.metricValue}>{formatDuration(m.total_downtime_s, timeUnit)}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Число перерывов</span>
                <span className={styles.metricValue}>{m.outage_count}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Переходов маршрута</span>
                <span className={styles.metricValue}>
                  {m.min_hop_count === null ? "—" : `${m.min_hop_count}–${m.max_hop_count}`}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>Средний / p95 RTT</span>
                <span className={styles.metricValue}>
                  {m.mean_rtt_ms === null ? "—" : `${m.mean_rtt_ms.toFixed(0)} / ${m.p95_rtt_ms?.toFixed(0)} мс`}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>Джиттер</span>
                <span className={styles.metricValue}>{m.jitter_ms === null ? "—" : `${m.jitter_ms.toFixed(1)} мс`}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Handover'ов</span>
                <span className={styles.metricValue}>{m.handover_count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {constellation && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Группировка в целом</span>
          <div className={styles.constellationGrid}>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Видимость по группировке</span>
              <div className={styles.metricRow}>
                <span>Среднее число видимых спутников</span>
                <span className={styles.metricValue}>{constellation.overallMeanVisible.toFixed(1)}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Минимум / максимум за период</span>
                <span className={styles.metricValue}>
                  {constellation.minVisible.toFixed(1)} / {constellation.maxVisible.toFixed(1)}
                </span>
              </div>
            </div>
            <div className={styles.card}>
              <span className={styles.cardTitle}>Самые загруженные спутники</span>
              <div className={styles.loadList}>
                {constellation.topSatellites.length === 0 && <span className={styles.metricRow}>Нет данных</span>}
                {constellation.topSatellites.map(([satId, load]) => (
                  <div className={styles.loadRow} key={satId}>
                    <span className={styles.loadId}>{satId}</span>
                    <div className={styles.loadBarTrack}>
                      <div className={styles.loadBarFill} style={{ width: `${(load / constellation.maxLoad) * 100}%` }} />
                    </div>
                    <span className={styles.loadValue}>{load} отсчётов</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Диаграмма доступности и отказов</span>
          <Chip icon="compare" label="Сравнить варианты" onClick={() => togglePanel("compare")} />
        </div>
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
