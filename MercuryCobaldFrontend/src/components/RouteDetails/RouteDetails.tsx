import { Icon } from "../common/Icon";
import { TimeScrubber } from "../Timeline/TimeScrubber";
import { useMapViewData } from "../../features/map-visualization/useMapViewData";
import { NO_ROUTE_REASON_LABEL } from "../../domain";
import styles from "./RouteDetails.module.css";

export function RouteDetails() {
  const { scenario, route, clients, selectedClientId, selectClient, tGrid, timeIndex, setTimeIndex, timeUnit } =
    useMapViewData();

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
        <div className={styles.note}>
          Алгоритм: поиск в ширину (BFS) по графу активных ISL-связей — кратчайший по числу переходов маршрут от
          клиентского пункта до ближайшего доступного шлюза. Маршрут пересчитывается на каждый отсчёт времени по
          текущему составу связей.
        </div>

        {!route || route.path.length === 0 ? (
          <div className={styles.reasonCard}>
            <Icon name="warning" />
            <span>{route?.reason ? NO_ROUTE_REASON_LABEL[route.reason] : "Нет данных о маршруте"}</span>
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
