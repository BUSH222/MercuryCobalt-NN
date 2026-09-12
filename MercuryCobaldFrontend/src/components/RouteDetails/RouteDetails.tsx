import { Icon } from "../common/Icon";
import { TimeScrubber } from "../Timeline/TimeScrubber";
import { useMapViewData } from "../../features/map-visualization/useMapViewData";
import { NO_ROUTE_REASON_LABEL, type LinkStatus } from "../../domain";
import { useUiStore } from "../../store/useUiStore";
import styles from "./RouteDetails.module.css";

const STATUS_LABEL: Record<LinkStatus, string> = {
  healthy: "Здоров",
  degraded: "Деградирован",
  outage: "Перерыв",
};

const STATUS_CLASS: Record<LinkStatus, string> = {
  healthy: styles.statusHealthy,
  degraded: styles.statusDegraded,
  outage: styles.statusOutage,
};

export function RouteDetails() {
  const { scenario, route, linkSample, clients, selectedClientId, selectClient, tGrid, timeIndex, setTimeIndex, timeUnit } =
    useMapViewData();
  const timeUnitForDurations = useUiStore((s) => s.timeUnit);
  const earthModel = useUiStore((s) => s.earthModel);

  if (!scenario) {
    return (
      <div className={styles.content}>
        <span>Сценарий не загружен.</span>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <select className={styles.select} value={selectedClientId ?? ""} onChange={(e) => selectClient(e.target.value || null)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.content}>
        {earthModel === "advanced" && (
          <div className={styles.advancedBanner}>
            <Icon name="globe" size={14} />
            <span>
              Продвинутый режим: горизонт видимости вычислен по реальному рельефу (WGS84), <code>min_elevation_deg</code>{" "}
              не используется.
            </span>
          </div>
        )}
        <div className={styles.note}>
          Алгоритм: поиск в ширину (BFS) по графу активных ISL-связей — кратчайший по числу переходов маршрут от
          клиентского пункта до ближайшего доступного шлюза. Маршрут пересчитывается на каждый отсчёт времени по
          текущему составу связей. Если валидных маршрутов несколько, показан один из них — эталонного маршрута не
          существует, важна лишь физическая допустимость показанного пути в данный момент.
        </div>

        {linkSample && (
          <>
            <div className={styles.badgeRow}>
              <span className={`${styles.statusBadge} ${STATUS_CLASS[linkSample.status]}`}>
                {STATUS_LABEL[linkSample.status]}
              </span>
              {linkSample.connected && (
                <span className={styles.hopBadge}>
                  {linkSample.uses_isl ? "Многоспутниковый релей (ISL)" : "Односпутниковый (bent-pipe)"}
                </span>
              )}
            </div>

            <div className={styles.statGrid}>
              <Stat label="Дистанция" value={linkSample.total_distance_km !== null ? `${linkSample.total_distance_km.toFixed(0)} км` : "—"} />
              <Stat label="RTT (физика)" value={linkSample.round_trip_latency_ms !== null ? `${linkSample.round_trip_latency_ms.toFixed(1)} мс` : "—"} />
              <Stat label="RTT (полный)" value={linkSample.total_rtt_ms !== null ? `${linkSample.total_rtt_ms.toFixed(1)} мс` : "—"} />
              <Stat label="FSPL (худший участок)" value={linkSample.fspl_db_bottleneck !== null ? `${linkSample.fspl_db_bottleneck.toFixed(1)} дБ` : "—"} />
              <Stat
                label="Запас по углу"
                value={linkSample.elevation_margin_deg !== null ? `${linkSample.elevation_margin_deg.toFixed(1)}°` : "—"}
              />
              <Stat label="Видимых спутников" value={String(linkSample.visible_satellite_count)} />
              <Stat label="Запасных путей (оценка)" value={String(linkSample.alt_disjoint_paths_estimate)} />
              <Stat
                label="С момента handover"
                value={
                  linkSample.time_since_last_handover_s !== null
                    ? formatSecondsShort(linkSample.time_since_last_handover_s, timeUnitForDurations)
                    : "—"
                }
              />
            </div>
          </>
        )}

        {!route || route.path.length === 0 ? (
          <div className={styles.reasonCard}>
            <Icon name="info" />
            <span>
              {route?.reason ? NO_ROUTE_REASON_LABEL[route.reason] : "Нет данных о маршруте"} — это штатное состояние
              сети в данный момент, а не ошибка сервиса.
            </span>
          </div>
        ) : (
          <>
            <span className={styles.hopBadge}>{route.hop_count} переходов</span>
            <div className={styles.pathList}>
              {route.nodes.map((node, idx) => (
                <div key={`${node.id}-${idx}`}>
                  <div className={styles.node}>
                    <div className={styles.nodeIcon}>
                      <Icon name={node.kind === "satellite" ? "satellite" : node.kind === "gateway" ? "dish" : "gateway"} />
                    </div>
                    <div>
                      <div className={styles.nodeLabel}>{node.id}</div>
                      <div className={styles.nodeKind}>
                        {node.kind === "client" ? "клиентский пункт" : node.kind === "gateway" ? "шлюз" : "спутник"}
                      </div>
                    </div>
                  </div>
                  {idx < route.nodes.length - 1 && <div className={styles.connector} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {tGrid.length > 0 && (
        <TimeScrubber tGrid={tGrid} timeIndex={timeIndex} onChange={setTimeIndex} timeUnit={timeUnit} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function formatSecondsShort(seconds: number, unit: "seconds" | "hms"): string {
  if (unit === "seconds") return `${seconds} с`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}
