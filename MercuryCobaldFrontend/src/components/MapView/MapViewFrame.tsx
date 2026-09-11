import { useState } from "react";
import type { GeoProjection } from "d3-geo";
import { Icon } from "../common/Icon";
import { Chip } from "../common/Chip";
import { TimeScrubber } from "../Timeline/TimeScrubber";
import { useMapViewData } from "../../features/map-visualization/useMapViewData";
import { MapCanvas, type MapClickTarget } from "./MapCanvas";
import { Legend } from "./Legend";
import { NodeDetailsCard } from "./NodeDetailsCard";
import styles from "./MapViewFrame.module.css";

interface MapViewFrameProps {
  width: number;
  height: number;
  projection: GeoProjection;
  showParallels?: boolean;
}

export function MapViewFrame({ width, height, projection, showParallels }: MapViewFrameProps) {
  const {
    scenario,
    snapshot,
    route,
    clients,
    selectedClientId,
    selectClient,
    tGrid,
    timeIndex,
    setTimeIndex,
    routeEdgePairs,
    routeNodeIds,
    showAllIsl,
    setShowAllIsl,
    timeUnit,
  } = useMapViewData();
  const [selectedNode, setSelectedNode] = useState<MapClickTarget | null>(null);

  if (!scenario) {
    return (
      <div className={styles.empty}>
        <Icon name="globe" size={28} />
        <span>Сценарий не загружен. Загрузите JSON в панели слева, чтобы увидеть группировку на карте.</span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={styles.empty}>
        <Icon name="globe" size={28} />
        <span>Расчёт ещё не выполнен. Нажмите «Запустить расчёт» в панели слева.</span>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <div className={styles.canvasWrap}>
        <div className={styles.toolbar}>
          <select
            className={styles.select}
            value={selectedClientId ?? ""}
            onChange={(e) => selectClient(e.target.value || null)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                Маршрут: {c.name}
              </option>
            ))}
          </select>
          <Chip
            icon="satellite"
            label="Показать все ISL"
            active={showAllIsl}
            onClick={() => setShowAllIsl(!showAllIsl)}
          />
        </div>

        <MapCanvas
          width={width}
          height={height}
          projection={projection}
          satellites={snapshot.satellites}
          groundSites={scenario.ground_sites}
          edges={snapshot.edges}
          routeEdgePairs={routeEdgePairs}
          routeNodeIds={routeNodeIds}
          showAllIsl={showAllIsl}
          showParallels={showParallels}
          selectedNodeId={selectedNode?.id ?? null}
          onSelectNode={setSelectedNode}
        />

        <Legend showAllIsl={showAllIsl} />

        {selectedNode && (
          <NodeDetailsCard
            target={selectedNode}
            satellites={snapshot.satellites}
            groundSites={scenario.ground_sites}
            snapshot={snapshot}
            route={route}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      <TimeScrubber tGrid={tGrid} timeIndex={timeIndex} onChange={setTimeIndex} timeUnit={timeUnit} />
    </div>
  );
}
