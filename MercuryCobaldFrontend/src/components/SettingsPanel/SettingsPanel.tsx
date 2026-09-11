import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Toggle } from "../common/Toggle";
import { Chip } from "../common/Chip";
import { useUiStore } from "../../store/useUiStore";
import { useScenarioStore } from "../../store/useScenarioStore";
import { scenarioApi } from "../../services/scenarioApi";
import { downloadJson } from "../../utils/download";
import styles from "./SettingsPanel.module.css";

export function SettingsPanel() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const showAllIsl = useUiStore((s) => s.showAllIsl);
  const setShowAllIsl = useUiStore((s) => s.setShowAllIsl);
  const timeUnit = useUiStore((s) => s.timeUnit);
  const setTimeUnit = useUiStore((s) => s.setTimeUnit);
  const linkAssumptions = useUiStore((s) => s.linkAssumptions);
  const setLinkAssumptions = useUiStore((s) => s.setLinkAssumptions);

  const effectiveScenario = useScenarioStore((s) => s.effectiveScenario);
  const series = useScenarioStore((s) => s.series);

  if (!open) return null;

  return (
    <Modal title="Настройки и экспорт" onClose={() => setOpen(false)}>
      <div className={styles.group}>
        <span className={styles.groupTitle}>Экспорт результата</span>
        <span className={styles.hint}>
          Формат cosmo-A-result-1.0: использованный сценарий, маршруты по каждому отсчёту и пункту, сводные показатели.
        </span>
        <Button
          icon="download"
          disabled={!effectiveScenario || !series}
          onClick={() => {
            if (!effectiveScenario || !series) return;
            const result = scenarioApi.buildResultExport(effectiveScenario, series);
            downloadJson(`${effectiveScenario.meta.id}_result.json`, result);
          }}
        >
          Скачать результат расчёта
        </Button>
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>Экспорт сценария</span>
        <span className={styles.hint}>Текущая конфигурация (cosmo-A-1.0) для повторной загрузки в сервис.</span>
        <Button
          icon="download"
          disabled={!effectiveScenario}
          onClick={() => {
            if (!effectiveScenario) return;
            downloadJson(`${effectiveScenario.meta.id}_scenario.json`, effectiveScenario);
          }}
        >
          Скачать изменённый сценарий
        </Button>
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
