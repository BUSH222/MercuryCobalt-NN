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
    </Modal>
  );
}
