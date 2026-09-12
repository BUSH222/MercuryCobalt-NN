import { Modal } from "../common/Modal";
import { Toggle } from "../common/Toggle";
import { Chip } from "../common/Chip";
import { useUiStore } from "../../store/useUiStore";
import { EnvironmentSettings } from "./EnvironmentSettings";
import { ROUTING_ALGORITHM_DESCRIPTION, ROUTING_ALGORITHM_IDS, ROUTING_ALGORITHM_LABEL } from "../../domain";
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
  const routingAlgorithm = useUiStore((s) => s.routingAlgorithm);
  const setRoutingAlgorithm = useUiStore((s) => s.setRoutingAlgorithm);

  if (!open) return null;

  return (
    <Modal title="Настройки" onClose={() => setOpen(false)}>
      <EnvironmentSettings />

      <div className={styles.group}>
        <span className={styles.groupTitle}>Алгоритм маршрутизации</span>
        <span className={styles.hint}>
          Способ поиска маршрута от клиентского пункта до шлюза. Меняется мгновенно — текущий отображаемый маршрут
          пересчитывается сразу, без повторного «Запустить расчёт»; на статистику и сравнение вариантов новый выбор
          повлияет с ближайшим пересчётом.
        </span>
        <div className={styles.algorithmRow}>
          {ROUTING_ALGORITHM_IDS.map((id) => (
            <Chip
              key={id}
              label={ROUTING_ALGORITHM_LABEL[id]}
              active={routingAlgorithm === id}
              onClick={() => setRoutingAlgorithm(id)}
            />
          ))}
        </div>
        <span className={styles.hint}>{ROUTING_ALGORITHM_DESCRIPTION[routingAlgorithm]}</span>
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
