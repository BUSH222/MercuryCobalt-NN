import { Component, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useMapViewData } from "../../features/map-visualization/useMapViewData";
import { TimeScrubber } from "../Timeline/TimeScrubber";
import { NodeDetailsCard } from "./NodeDetailsCard";
import type { MapClickTarget } from "./MapCanvas";
import { GlobeScene } from "./GlobeScene";
import styles from "./GlobeMap.module.css";

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    return this.state.failed ? <div className={styles.empty} role="alert">Не удалось открыть 3D-карту. Проверьте поддержку WebGL и аппаратное ускорение браузера. Прямоугольная карта остаётся доступна.</div> : this.props.children;
  }
}

export default function GlobeMap() {
  const data = useMapViewData();
  const [selectedNode, setSelectedNode] = useState<MapClickTarget | null>(null);
  const [satelliteCoverage, setSatelliteCoverage] = useState(true);
  const [groundCoverage, setGroundCoverage] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const { scenario, snapshot, route } = data;
  if (!scenario || !snapshot) return <div className={styles.empty}>{!scenario ? "Загрузите сценарий в панели слева, чтобы увидеть 3D-глобус." : "Нажмите «Запустить расчёт», чтобы увидеть группировку на 3D-глобусе."}</div>;

  return (
    <div className={styles.frame}>
      <div className={styles.toolbar}>
        <select aria-label="Клиент для маршрута на 3D-карте" value={data.selectedClientId ?? ""} onChange={(e) => data.selectClient(e.target.value || null)}>
          {data.clients.map((client) => <option key={client.id} value={client.id}>Маршрут: {client.name}</option>)}
        </select>
        <button aria-pressed={data.showAllIsl} onClick={() => data.setShowAllIsl(!data.showAllIsl)}>Все ISL</button>
        <button aria-pressed={satelliteCoverage} onClick={() => setSatelliteCoverage(!satelliteCoverage)}>Покрытие спутников</button>
        <button aria-pressed={groundCoverage} onClick={() => setGroundCoverage(!groundCoverage)}>Зоны станций</button>
        <button onClick={() => setResetKey((key) => key + 1)}>Сбросить вид</button>
      </div>
      <div className={styles.viewport} aria-label="Интерактивный 3D-глобус Земли">
        <GlobeBoundary>
          <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [1.6, 2.3, 2.3], fov: 42, near: 0.01, far: 30 }} gl={{ antialias: true, alpha: true }} fallback={<div className={styles.empty}>WebGL недоступен. Используйте прямоугольную карту.</div>}>
            <GlobeScene scenario={scenario} snapshot={snapshot} routeEdgePairs={data.routeEdgePairs} routeNodeIds={data.routeNodeIds} showAllIsl={data.showAllIsl} satelliteCoverage={satelliteCoverage} groundCoverage={groundCoverage} selectedNode={selectedNode} onSelect={setSelectedNode} resetKey={resetKey} />
          </Canvas>
        </GlobeBoundary>
        {selectedNode && (
          <NodeDetailsCard
            target={selectedNode}
            satellites={snapshot.satellites}
            satelliteDesigns={scenario.design.satellites}
            groundSites={scenario.ground_sites}
            snapshot={snapshot}
            route={route}
            sunEcef={data.sunEcef}
            onClose={() => setSelectedNode(null)}
          />
        )}
        <div className={styles.hint}>Перетаскивание — вращение · Колесо — масштаб · Нажатие — сведения</div>
      </div>
      <div className={styles.legend}>
        <span><i className={styles.satellite} />Спутник / зона на Земле</span>
        <span><i className={styles.client} />Клиент / зона на орбите</span>
        <span><i className={styles.gateway} />Шлюз / маршрут</span>
        <span><i className={styles.inactive} />Неактивный спутник</span>
        <span><i className={styles.down} />Шлюз недоступен</span>
        <small>Границы зон: угол места ≥ {scenario.environment.min_elevation_deg}°. Геометрическая видимость не гарантирует маршрут.</small>
      </div>
      <TimeScrubber tGrid={data.tGrid} timeIndex={data.timeIndex} onChange={data.setTimeIndex} timeUnit={data.timeUnit} />
    </div>
  );
}
