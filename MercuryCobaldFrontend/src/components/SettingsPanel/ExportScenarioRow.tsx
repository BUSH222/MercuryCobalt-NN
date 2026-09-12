import { useState } from "react";
import type { Scenario } from "../../domain";
import { Button } from "../common/Button";
import { downloadJson } from "../../utils/download";
import styles from "./ExportScenarioRow.module.css";

interface ExportScenarioRowProps {
  label: string;
  scenario: Scenario;
}

/** One exportable scenario: editable title/id (defaulting to its own metadata) plus a download button. */
export function ExportScenarioRow({ label, scenario }: ExportScenarioRowProps) {
  const [title, setTitle] = useState(scenario.meta.title);
  const [id, setId] = useState(scenario.meta.id);

  const handleDownload = (): void => {
    const trimmedTitle = title.trim();
    const trimmedId = id.trim();
    if (!trimmedTitle || !trimmedId) return;
    downloadJson(`${trimmedId}.json`, { ...scenario, meta: { title: trimmedTitle, id: trimmedId } });
  };

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Название</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>ID (meta.id)</span>
          <input className={styles.input} value={id} onChange={(e) => setId(e.target.value)} />
        </div>
      </div>
      <Button icon="download" disabled={!title.trim() || !id.trim()} onClick={handleDownload}>
        Скачать сценарий
      </Button>
    </div>
  );
}
