import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Icon } from "../../components/common/Icon";
import { Button } from "../../components/common/Button";
import { ErrorList } from "../../components/common/ErrorList";
import { useAppDispatch } from "../../store/hooks";
import { loadScenario } from "../../store/scenarioSlice";
import { scenarioApi } from "../../services/scenarioApi";
import type { ValidationError } from "../../utils/validation";
import { SAMPLE_SCENARIOS } from "../../mocks/scenarios";
import styles from "./ScenarioLoader.module.css";

export function ScenarioLoader() {
  const dispatch = useAppDispatch();
  const [dragging, setDragging] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitText(text: string): Promise<void> {
    if (!text.trim()) return;
    setBusy(true);
    setErrors(null);
    const result = await scenarioApi.loadScenarioFromText(text);
    setBusy(false);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    await dispatch(loadScenario(result.scenario));
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;
    const text = await file.text();
    await submitText(text);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <Icon name="upload" size={22} />
        <span className={styles.dropzoneTitle}>Перетащите файл сценария сюда</span>
        <span className={styles.hint}>или нажмите, чтобы выбрать JSON-файл</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      <div className={styles.divider}>или вставьте JSON</div>

      <textarea
        className={styles.textarea}
        placeholder='{"schema_version": "cosmo-A-1.0", ...}'
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
      />
      <Button variant="primary" icon="check" disabled={busy || !pasteText.trim()} onClick={() => void submitText(pasteText)}>
        {busy ? "Проверка…" : "Загрузить из текста"}
      </Button>

      {errors && <ErrorList headline="Сценарий не прошёл проверку" errors={errors} />}

      <div className={styles.samples}>
        <span className={styles.samplesTitle}>Примеры сценариев</span>
        {SAMPLE_SCENARIOS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className={styles.sampleButton}
            onClick={() => void submitText(JSON.stringify(sample.scenario))}
          >
            <span>{sample.label}</span>
            <Icon name="chevron-right" />
          </button>
        ))}
      </div>
    </div>
  );
}
