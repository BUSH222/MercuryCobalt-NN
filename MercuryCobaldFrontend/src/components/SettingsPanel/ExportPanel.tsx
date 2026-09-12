import { Modal } from "../common/Modal";
import { useUiStore } from "../../store/useUiStore";
import { useAppSelector } from "../../store/hooks";
import { ExportScenarioRow } from "./ExportScenarioRow";
import styles from "./SettingsPanel.module.css";

/**
 * Its own modal, separate from "Настройки" — exporting a file is a different
 * kind of action from tuning display/physics settings, and now that the
 * settings modal also lets you edit and apply the scenario's environment
 * block, keeping export apart avoids conflating "commit to the live
 * scenario" with "download a file" in one dialog.
 *
 * The sidebar's "Сохранить вариант" only ever registers a named variant for
 * the comparison table — nothing here downloads on its own. Every scenario
 * the session currently has (the live, possibly unsaved current one, plus
 * every saved variant) is listed with its own editable title/id and its own
 * download button.
 */
export function ExportPanel() {
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const effectiveScenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const variants = useAppSelector((s) => s.scenario.variants);

  if (!open) return null;

  const exportEntries = [
    ...(effectiveScenario ? [{ id: "__current__", label: "Текущий (не сохранён)", scenario: effectiveScenario }] : []),
    ...variants.map((v) => ({ id: v.id, label: v.name, scenario: v.effective_scenario })),
  ];

  return (
    <Modal title="Экспорт сценария" onClose={() => setOpen(false)}>
      <div className={styles.group}>
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
    </Modal>
  );
}
