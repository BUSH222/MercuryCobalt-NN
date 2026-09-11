import { Fragment } from "react";
import type { ClientAvailabilityMetrics, GroundSite } from "../../domain";
import { IconButton } from "../common/Chip";
import { formatDuration, type TimeDisplayUnit } from "../../utils/time";
import type { ScenarioConditionFlags } from "../../utils/scenarioClassification";
import styles from "./ComparisonTable.module.css";

export interface ComparisonColumn {
  id: string;
  name: string;
  summaryLines: string[];
  conditionFlags: ScenarioConditionFlags;
  metricsByClient: Record<string, ClientAvailabilityMetrics>;
  removable: boolean;
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
  clients: GroundSite[];
  targetAvailability: number;
  timeUnit: TimeDisplayUnit;
  onRemove: (id: string) => void;
}

export function ComparisonTable({ columns, clients, targetAvailability, timeUnit, onRemove }: ComparisonTableProps) {
  const targetPct = targetAvailability * 100;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rowLabelCell}>Показатель</th>
            {columns.map((col) => (
              <th key={col.id}>
                <div className={styles.columnHeader}>
                  <div className={styles.columnName}>
                    <span>{col.name}</span>
                    {col.removable && <IconButton icon="trash" title="Удалить вариант" onClick={() => onRemove(col.id)} />}
                  </div>
                  <span className={col.conditionFlags.isNominal ? styles.conditionNominal : styles.conditionStress}>
                    {col.conditionFlags.isNominal ? "Штатный вариант" : col.conditionFlags.labels.join(" · ")}
                  </span>
                  <div className={styles.diffLines}>
                    {col.summaryLines.map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <Fragment key={client.id}>
              <tr className={styles.groupRow}>
                <td colSpan={columns.length + 1}>{client.name}</td>
              </tr>
              <tr key={`${client.id}-visibility`}>
                <td className={styles.rowLabelCell}>Видимость спутника</td>
                {columns.map((col) => (
                  <td key={col.id}>{((col.metricsByClient[client.id]?.visibility_fraction ?? 0) * 100).toFixed(1)}%</td>
                ))}
              </tr>
              <tr key={`${client.id}-availability`}>
                <td className={styles.rowLabelCell}>Доступность связи</td>
                {columns.map((col) => {
                  const m = col.metricsByClient[client.id];
                  const pct = (m?.availability_fraction ?? 0) * 100;
                  return (
                    <td key={col.id} className={pct >= targetPct ? styles.pass : styles.fail}>
                      {pct.toFixed(1)}%{m ? ` (${m.available_tick_count}/${m.total_tick_count})` : ""}
                    </td>
                  );
                })}
              </tr>
              <tr key={`${client.id}-outage`}>
                <td className={styles.rowLabelCell}>Макс. перерыв</td>
                {columns.map((col) => (
                  <td key={col.id}>{formatDuration(col.metricsByClient[client.id]?.max_outage_s ?? 0, timeUnit)}</td>
                ))}
              </tr>
              <tr key={`${client.id}-hops`}>
                <td className={styles.rowLabelCell}>Переходов маршрута</td>
                {columns.map((col) => {
                  const m = col.metricsByClient[client.id];
                  return <td key={col.id}>{m?.min_hop_count == null ? "—" : `${m.min_hop_count}–${m.max_hop_count}`}</td>;
                })}
              </tr>
              <tr key={`${client.id}-downtime`}>
                <td className={styles.rowLabelCell}>Суммарный простой</td>
                {columns.map((col) => (
                  <td key={col.id}>{formatDuration(col.metricsByClient[client.id]?.total_downtime_s ?? 0, timeUnit)}</td>
                ))}
              </tr>
              <tr key={`${client.id}-outage-count`}>
                <td className={styles.rowLabelCell}>Число перерывов</td>
                {columns.map((col) => (
                  <td key={col.id}>{col.metricsByClient[client.id]?.outage_count ?? "—"}</td>
                ))}
              </tr>
              <tr key={`${client.id}-rtt`}>
                <td className={styles.rowLabelCell}>Средний / p95 RTT</td>
                {columns.map((col) => {
                  const m = col.metricsByClient[client.id];
                  return (
                    <td key={col.id}>
                      {m?.mean_rtt_ms == null ? "—" : `${m.mean_rtt_ms.toFixed(0)} / ${m.p95_rtt_ms?.toFixed(0)} мс`}
                    </td>
                  );
                })}
              </tr>
              <tr key={`${client.id}-jitter`}>
                <td className={styles.rowLabelCell}>Джиттер</td>
                {columns.map((col) => {
                  const jitter = col.metricsByClient[client.id]?.jitter_ms;
                  return <td key={col.id}>{jitter == null ? "—" : `${jitter.toFixed(1)} мс`}</td>;
                })}
              </tr>
              <tr key={`${client.id}-handovers`}>
                <td className={styles.rowLabelCell}>Handover'ов</td>
                {columns.map((col) => (
                  <td key={col.id}>{col.metricsByClient[client.id]?.handover_count ?? "—"}</td>
                ))}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
