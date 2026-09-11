import type { GroundSite, Route, SatelliteState, Snapshot } from "../../domain";
import { IconButton } from "../common/Chip";
import styles from "./NodeDetailsCard.module.css";
import type { MapClickTarget } from "./MapCanvas";

interface NodeDetailsCardProps {
  target: MapClickTarget;
  satellites: SatelliteState[];
  groundSites: GroundSite[];
  snapshot: Snapshot;
  route: Route | null;
  onClose: () => void;
}

export function NodeDetailsCard({ target, satellites, groundSites, snapshot, route, onClose }: NodeDetailsCardProps) {
  if (target.kind === "satellite") {
    const sat = satellites.find((s) => s.id === target.id);
    if (!sat) return null;
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>{sat.id}</span>
          <IconButton icon="close" title="Закрыть" onClick={onClose} />
        </div>
        <div className={styles.rows}>
          <Row label="Состояние" value={sat.active ? "активен" : "неактивен"} tone={sat.active ? "ok" : "bad"} />
          <Row label="X, км" value={sat.x_km.toFixed(0)} />
          <Row label="Y, км" value={sat.y_km.toFixed(0)} />
          <Row label="Z, км" value={sat.z_km.toFixed(0)} />
          <Row label="На маршруте" value={route?.path.includes(sat.id) ? "да" : "нет"} />
        </div>
      </div>
    );
  }

  const site = groundSites.find((s) => s.id === target.id);
  if (!site) return null;
  const isClientCurrent = route?.client_id === site.id;
  const down = snapshot.gateway_down[site.id] ?? false;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{site.name}</span>
        <IconButton icon="close" title="Закрыть" onClick={onClose} />
      </div>
      <div className={styles.rows}>
        <Row label="Роль" value={site.role === "gateway" ? "шлюз" : "клиент"} />
        <Row label="Широта" value={`${site.lat_deg.toFixed(2)}°`} />
        <Row label="Долгота" value={`${site.lon_deg.toFixed(2)}°`} />
        {site.role === "gateway" && <Row label="Доступность" value={down ? "недоступен" : "в норме"} tone={down ? "bad" : "ok"} />}
        {isClientCurrent && (
          <Row label="Маршрут сейчас" value={route && route.path.length > 0 ? "есть" : "отсутствует"} tone={route && route.path.length > 0 ? "ok" : "bad"} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <span className={`${styles.value} ${tone ? styles[tone] : ""}`}>{value}</span>
    </div>
  );
}
