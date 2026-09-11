import { useMemo } from "react";
import { Button } from "../../components/common/Button";
import { useScenarioStore } from "../../store/useScenarioStore";
import styles from "./CoverageOptimizer.module.css";

function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

/**
 * Proposes plane RAAN/phase spacing that maximises the *worst* per-client
 * availability, altitude and inclination held fixed — see the engineering
 * note in utils/coverageOptimizer.ts for why inter-plane spacing (not a
 * rigid whole-constellation rotation) is the parameter that actually moves
 * coverage on a full-day horizon. The search only proposes candidates; the
 * engineer picks one and applies it through the normal override/compute/save
 * flow, nothing here writes a result until "Применить" is clicked.
 */
export function CoverageOptimizer() {
  const searching = useScenarioStore((s) => s.coverageSearching);
  const candidates = useScenarioStore((s) => s.coverageCandidates);
  const error = useScenarioStore((s) => s.coverageError);
  const searchCoverage = useScenarioStore((s) => s.searchCoverage);
  const applyCoverageCandidate = useScenarioStore((s) => s.applyCoverageCandidate);
  const baseline = useScenarioStore((s) => s.baseline);

  const baselineSpacing = useMemo(() => {
    if (!baseline || baseline.design.planes.length < 2) return null;
    const [p0, p1] = baseline.design.planes;
    return {
      raan: normalizeDeg(p1!.raan_deg - p0!.raan_deg),
      phase: normalizeDeg(p1!.phase_deg - p0!.phase_deg),
    };
  }, [baseline]);

  return (
    <div className={styles.wrap}>
      <span className={styles.hint}>
        Подбирает интервал RAAN и фазовый сдвиг между плоскостями (высота и наклонение не меняются), максимизируя
        доступность связи в наихудшем по клиентам случае. Сначала дешёвая оценка по видимости, затем точный пересчёт
        маршрутов для лучших кандидатов.
      </span>
      <Button icon="compass" disabled={searching} onClick={() => void searchCoverage()}>
        {searching ? "Идёт поиск…" : "Подобрать конфигурацию"}
      </Button>
      {error && <span className={styles.error}>{error}</span>}
      {candidates.length > 0 && (
        <div className={styles.list}>
          {candidates.map((c, idx) => {
            const isCurrent =
              baselineSpacing !== null &&
              Math.abs(c.raan_spacing_deg - baselineSpacing.raan) < 0.01 &&
              Math.abs(c.phase_spacing_deg - baselineSpacing.phase) < 0.01;
            return (
            <div className={styles.item} key={c.id}>
              <div className={styles.itemHeader}>
                <span className={styles.itemRank}>#{idx + 1}{isCurrent ? " · текущая раскладка" : ""}</span>
                <Button onClick={() => applyCoverageCandidate(c)} disabled={isCurrent}>
                  {isCurrent ? "Уже применена" : "Применить"}
                </Button>
              </div>
              <span className={styles.itemParams}>
                интервал RAAN {c.raan_spacing_deg}°, фаза {c.phase_spacing_deg}°
              </span>
              <div className={styles.itemMetrics}>
                <span>
                  Худшая доступность: <span className={styles.itemMetricValue}>{(c.worst_availability_fraction * 100).toFixed(1)}%</span>
                </span>
                <span>
                  Средняя: <span className={styles.itemMetricValue}>{(c.mean_availability_fraction * 100).toFixed(1)}%</span>
                </span>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
