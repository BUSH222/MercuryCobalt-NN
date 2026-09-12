import type { GroundSite, Route, Satellite, SatelliteState, Snapshot } from "../../domain";
import type { Vec3 } from "../../utils/geometry";
import { isEclipsed } from "../../utils/sun";
import { IconButton } from "../common/Chip";
import styles from "./NodeDetailsCard.module.css";
import type { MapClickTarget } from "./MapCanvas";

interface NodeDetailsCardProps {
  target: MapClickTarget;
  satellites: SatelliteState[];
  /** Design-time satellite list (plane membership) — a separate array from the per-instant `satellites` above, since plane_id isn't part of the computed snapshot. */
  satelliteDesigns: Satellite[];
  groundSites: GroundSite[];
  snapshot: Snapshot;
  route: Route | null;
  /** Sun's Earth-fixed direction at the displayed instant, for the eclipse row; omitted while unavailable. */
  sunEcef?: Vec3 | null;
  onClose: () => void;
}

export function NodeDetailsCard({
  target,
  satellites,
  satelliteDesigns,
  groundSites,
  snapshot,
  route,
  sunEcef,
  onClose,
}: NodeDetailsCardProps) {
  if (target.kind === "satellite") {
    const sat = satellites.find((s) => s.id === target.id);
    if (!sat) return null;
    const planeId = satelliteDesigns.find((s) => s.id === target.id)?.plane_id;
    const eclipsed = sunEcef ? isEclipsed(sunEcef, { x: sat.x_km, y: sat.y_km, z: sat.z_km }) : null;
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>{sat.id}</span>
          <IconButton icon="close" title="Закрыть" onClick={onClose} />
        </div>
        <div className={styles.rows}>
          <Row label="Состояние" value={sat.active ? "активен" : "неактивен"} tone={sat.active ? "ok" : "bad"} />
          <Row label="Плоскость" value={planeId ?? "—"} />
          {eclipsed !== null && (
            <Row label="Солнце" value={eclipsed ? "в тени Земли" : "освещён"} tone={eclipsed ? "bad" : "ok"} />
          )}
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
