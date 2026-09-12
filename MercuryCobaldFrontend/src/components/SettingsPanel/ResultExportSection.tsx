import { useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { Button } from "../common/Button";
import { Chip } from "../common/Chip";
import { downloadText } from "../../utils/download";
import { RESULT_EXPORTERS, type ResultExportFormatId } from "../../export";
import styles from "./SettingsPanel.module.css";

/**
 * Downloads the last computed result (not the scenario config above it) in
 * one of a few formats. Only the live, just-computed series has per-instant
 * routes — saved variants only keep their aggregate metrics (see
 * `SavedVariant`) — so unlike `ExportScenarioRow`'s per-variant list, this
 * always operates on the current result.
 */
export function ResultExportSection() {
  const effectiveScenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const series = useAppSelector((s) => s.scenario.series);
  const [formatId, setFormatId] = useState<ResultExportFormatId>("json");

  const exporter = RESULT_EXPORTERS.find((e) => e.id === formatId)!;

  const handleDownload = (): void => {
    if (!effectiveScenario || !series) return;
    const file = exporter.export(effectiveScenario, series);
    downloadText(file.filename, file.content, file.mimeType);
  };

  return (
    <div className={styles.group}>
      <span className={styles.groupTitle}>Экспорт результата расчёта</span>
      <span className={styles.hint}>
        Выгружает последний выполненный расчёт — маршруты и показатели доступности, а не сам сценарий.
      </span>
      <div className={styles.unitRow}>
        {RESULT_EXPORTERS.map((e) => (
          <Chip key={e.id} label={e.label} active={formatId === e.id} onClick={() => setFormatId(e.id)} />
        ))}
      </div>
      {!effectiveScenario || !series ? (
        <span className={styles.hint}>Запустите расчёт, чтобы выгрузить результат.</span>
      ) : (
        <Button icon="download" onClick={handleDownload}>
          Скачать результат ({exporter.label})
        </Button>
      )}
    </div>
  );
}
