import { useMemo } from "react";
import type { GroundSite, RoutingAlgorithmId, Scenario, Snapshot } from "../../domain";
import { NO_ROUTE_REASON_LABEL, ROUTING_ALGORITHM_IDS, ROUTING_ALGORITHM_LABEL } from "../../domain";
import { computeRoute, pathBottleneckMargin, pathTotalDistanceKm } from "../../utils/routing";
import styles from "./RouteDetails.module.css";

interface Props {
  scenario: Scenario;
  snapshot: Snapshot;
  client: GroundSite;
  activeAlgorithm: RoutingAlgorithmId;
}

/**
 * What every registered algorithm would produce for this exact client and
 * instant, side by side — computed fresh here purely for display, entirely
 * separate from the series that actually drives the map/stats/comparison
 * panels (which only ever reflects the algorithm selected in Settings).
 * Cheap: four single-client, single-instant route searches, not a full
 * horizon recompute.
 */
export function RouteAlgorithmComparison({ scenario, snapshot, client, activeAlgorithm }: Props) {
  const rows = useMemo(
    () =>
      ROUTING_ALGORITHM_IDS.map((algorithm) => {
        const route = computeRoute(scenario, snapshot, client, algorithm);
        return {
          algorithm,
          route,
          totalDistanceKm: pathTotalDistanceKm(scenario, snapshot, route.path),
          margin: pathBottleneckMargin(scenario, snapshot, route.path),
        };
      }),
    [scenario, snapshot, client],
  );

  return (
    <div className={styles.comparisonWrap}>
      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            <th>Алгоритм</th>
            <th>Переходы</th>
            <th>Дистанция</th>
            <th title="Запас на самом слабом звене пути: доля до порога видимости на наземных участках, доля до предельной дальности на ISL. Больше — надёжнее; отрицательное значение возможно в продвинутом режиме видимости.">
              Устойчивость
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ algorithm, route, totalDistanceKm, margin }) => (
            <tr key={algorithm} className={algorithm === activeAlgorithm ? styles.comparisonActiveRow : undefined}>
              <td>{ROUTING_ALGORITHM_LABEL[algorithm]}</td>
              <td>{route.hop_count ?? "—"}</td>
              <td>{totalDistanceKm !== null ? `${totalDistanceKm.toFixed(0)} км` : "—"}</td>
              <td>{margin !== null ? `${(margin * 100).toFixed(0)}%` : route.reason ? NO_ROUTE_REASON_LABEL[route.reason] : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
