import { Modal } from "../common/Modal";
import { Toggle } from "../common/Toggle";
import { Chip } from "../common/Chip";
import { useUiStore } from "../../store/useUiStore";
import { useTerrainStore } from "../../store/useTerrainStore";
import { EnvironmentSettings } from "./EnvironmentSettings";
import styles from "./SettingsPanel.module.css";

/**
 * Display preferences, RTT/FSPL assumptions, and the scenario's environment
 * block. Exporting lives in its own separate modal (`ExportPanel`) — a
 * different kind of action (download a file) from the ones here (tune a
 * display setting, or commit an environment override to the live scenario).
 */
export function SettingsPanel() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const showAllIsl = useUiStore((s) => s.showAllIsl);
  const setShowAllIsl = useUiStore((s) => s.setShowAllIsl);
  const timeUnit = useUiStore((s) => s.timeUnit);
  const setTimeUnit = useUiStore((s) => s.setTimeUnit);
  const linkAssumptions = useUiStore((s) => s.linkAssumptions);
  const setLinkAssumptions = useUiStore((s) => s.setLinkAssumptions);
  const earthModel = useUiStore((s) => s.earthModel);
  const setEarthModel = useUiStore((s) => s.setEarthModel);
  const terrainStatus = useTerrainStore((s) => s.status);
  const terrainError = useTerrainStore((s) => s.error);

  if (!open) return null;

  return (
    <Modal title="Настройки" onClose={() => setOpen(false)}>
      <EnvironmentSettings />

      <div className={styles.group}>
        <span className={styles.groupTitle}>Модель Земли</span>
        <span className={styles.hint}>
          «Базовая» — сферическая Земля и порог <code>min_elevation_deg</code>, как сейчас. «Продвинутая» — эллипсоид
          WGS84 и реальный рельеф вокруг каждого наземного пункта (клиентского и шлюза); в этом режиме{" "}
          <code>min_elevation_deg</code> не используется вовсе, видимость решает горизонт по рельефу.
          Межспутниковые связи рельеф не учитывают в любом режиме — на орбите он не имеет смысла.
        </span>
        <div className={styles.unitRow}>
          <Chip label="Базовая (сфера)" active={earthModel === "basic"} onClick={() => setEarthModel("basic")} />
          <Chip
            label="Продвинутая (рельеф, WGS84)"
            active={earthModel === "advanced"}
            onClick={() => setEarthModel("advanced")}
          />
        </div>
        {earthModel === "advanced" && terrainStatus === "loading" && (
          <span className={styles.hint}>Загрузка рельефа для наземных пунктов… это может занять несколько секунд на пункт, особенно без кэша.</span>
        )}
        {earthModel === "advanced" && terrainStatus === "error" && (
          <span className={styles.error}>Не удалось загрузить рельеф: {terrainError}</span>
        )}
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>Отображение</span>
        <Toggle label="Показывать все ISL-связи по умолчанию" checked={showAllIsl} onChange={setShowAllIsl} />
        <div>
          <span className={styles.hint}>Единицы времени</span>
          <div className={styles.unitRow} style={{ marginTop: 6 }}>
            <Chip label="Секунды" active={timeUnit === "seconds"} onClick={() => setTimeUnit("seconds")} />
            <Chip label="ЧЧ:ММ:СС" active={timeUnit === "hms"} onClick={() => setTimeUnit("hms")} />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>Допущения расчёта RTT/FSPL</span>
        <span className={styles.hint}>
          Не входят в схему сценария — используются только для RTT, FSPL и статуса линка. Вступают в силу после
          повторного «Запустить расчёт».
        </span>
        <label className={styles.assumptionRow}>
          <span>Частота, ГГц (для FSPL)</span>
          <input
            type="number"
            className={styles.assumptionInput}
            min={0.1}
            step={0.5}
            value={linkAssumptions.frequency_ghz}
            onChange={(e) => setLinkAssumptions({ frequency_ghz: Number(e.target.value) })}
          />
        </label>
        <label className={styles.assumptionRow}>
          <span>Задержка коммутации на переход, мс</span>
          <input
            type="number"
            className={styles.assumptionInput}
            min={0}
            step={0.5}
            value={linkAssumptions.per_hop_processing_delay_ms}
            onChange={(e) => setLinkAssumptions({ per_hop_processing_delay_ms: Number(e.target.value) })}
          />
        </label>
        <label className={styles.assumptionRow}>
          <span>Порог «деградирован»: запас по углу, °</span>
          <input
            type="number"
            className={styles.assumptionInput}
            min={0}
            step={1}
            value={linkAssumptions.degraded_elevation_margin_deg}
            onChange={(e) => setLinkAssumptions({ degraded_elevation_margin_deg: Number(e.target.value) })}
          />
        </label>
        <label className={styles.assumptionRow}>
          <span>Порог «деградирован»: RTT, мс</span>
          <input
            type="number"
            className={styles.assumptionInput}
            min={0}
            step={1}
            value={linkAssumptions.degraded_rtt_ms}
            onChange={(e) => setLinkAssumptions({ degraded_rtt_ms: Number(e.target.value) })}
          />
        </label>
      </div>
    </Modal>
  );
}
