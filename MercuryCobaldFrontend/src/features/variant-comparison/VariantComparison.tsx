import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { Chip } from "../../components/common/Chip";
import { ComparisonTable, type ComparisonColumn } from "../../components/ComparisonTable/ComparisonTable";
import { useScenarioStore } from "../../store/useScenarioStore";
import { useUiStore } from "../../store/useUiStore";
import { summarizeVariant } from "../../utils/variantDiff";
import type { ClientAvailabilityMetrics, GroundSite, SeriesMetrics } from "../../domain";
import styles from "./VariantComparison.module.css";

function metricsMap(metrics: SeriesMetrics): Record<string, ClientAvailabilityMetrics> {
  return Object.fromEntries(metrics.per_client.map((m) => [m.client_id, m]));
}

export function VariantComparison() {
  const baseline = useScenarioStore((s) => s.baseline);
  const effectiveScenario = useScenarioStore((s) => s.effectiveScenario);
  const overrides = useScenarioStore((s) => s.overrides);
  const series = useScenarioStore((s) => s.series);
  const variants = useScenarioStore((s) => s.variants);
  const removeVariant = useScenarioStore((s) => s.removeVariant);
  const timeUnit = useUiStore((s) => s.timeUnit);
  const togglePanel = useUiStore((s) => s.togglePanel);

  const columns = useMemo<ComparisonColumn[]>(() => {
    const cols: ComparisonColumn[] = [];
    if (baseline && effectiveScenario && series) {
      cols.push({
        id: "__current__",
        name: "Текущий (не сохранён)",
        summaryLines: summarizeVariant(baseline, {
          id: "__current__",
          name: "",
          created_at: "",
          overrides,
          effective_scenario: effectiveScenario,
          metrics: series.metrics,
        }),
        metricsByClient: metricsMap(series.metrics),
        removable: false,
      });
    }
    for (const variant of variants) {
      cols.push({
        id: variant.id,
        name: variant.name,
        summaryLines: baseline ? summarizeVariant(baseline, variant) : [],
        metricsByClient: metricsMap(variant.metrics),
        removable: true,
      });
    }
    return cols;
  }, [baseline, effectiveScenario, overrides, series, variants]);

  const clients = useMemo<GroundSite[]>(() => {
    const seen = new Map<string, GroundSite>();
    const scenarios = [effectiveScenario, ...variants.map((v) => v.effective_scenario)].filter(
      (s): s is NonNullable<typeof s> => s !== null,
    );
    for (const scenario of scenarios) {
      for (const site of scenario.ground_sites) {
        if (site.role === "client" && !seen.has(site.id)) seen.set(site.id, site);
      }
    }
    return [...seen.values()];
  }, [effectiveScenario, variants]);

  if (columns.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon name="compare" size={28} />
        <span>Загрузите сценарий и сохраните варианты, чтобы сравнить их здесь.</span>
      </div>
    );
  }

  const targetAvailability = series?.metrics.target_availability ?? variants[0]?.metrics.target_availability ?? 0.9;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {variants.length < 1 && (
          <span className={styles.hint}>
            Сохраните как минимум два варианта конфигурации в панели слева, чтобы полноценно их сопоставить.
          </span>
        )}
        <Chip icon="chart" label="Открыть статистику" onClick={() => togglePanel("stats")} />
      </div>
      <ComparisonTable
        columns={columns}
        clients={clients}
        targetAvailability={targetAvailability}
        timeUnit={timeUnit}
        onRemove={removeVariant}
      />
    </div>
  );
}
