import { Modal } from "../common/Modal";
import { Toggle } from "../common/Toggle";
import { Chip } from "../common/Chip";
import { useUiStore } from "../../store/useUiStore";
import { useAppSelector } from "../../store/hooks";
import { ExportScenarioRow } from "./ExportScenarioRow";
import styles from "./SettingsPanel.module.css";

/**
 * Saving/exporting lives entirely here, not in the sidebar — the sidebar's
 * "Сохранить вариант" only ever registers a named variant for the comparison
 * table. Every scenario the session currently has (the live, possibly
 * unsaved current one, plus every saved variant) is listed with its own
 * editable title/id and its own download button; there is no separate
 * "export the calculation result" option any more.
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

  const effectiveScenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const variants = useAppSelector((s) => s.scenario.variants);

  if (!open) return null;

  const exportEntries = [
    ...(effectiveScenario ? [{ id: "__current__", label: "Текущий (не сохранён)", scenario: effectiveScenario }] : []),
    ...variants.map((v) => ({ id: v.id, label: v.name, scenario: v.effective_scenario })),
  ];

  return (
    <Modal title="Настройки и экспорт" onClose={() => setOpen(false)}>
      <div className={styles.group}>
        <span className={styles.groupTitle}>Экспорт сценария</span>
        <span className={styles.hint}>
          Формат cosmo-A-1.0, готовый к повторной загрузке в сервис. Название и ID можно поменять перед скачиванием —
          они попадут в файл как <code>meta.title</code>/<code>meta.id</code>.
        </span>
        {exportEntries.length === 0 ? (
          <span className={styles.hint}>Загрузите сценарий, чтобы его можно было выгрузить.</span>
        ) : (
          <div className={styles.exportList}>
            {exportEntries.map((entry) => (
              <ExportScenarioRow key={entry.id} label={entry.label} scenario={entry.scenario} />
            ))}
          </div>
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
