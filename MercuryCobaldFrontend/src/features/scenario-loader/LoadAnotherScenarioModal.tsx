import { Modal } from "../../components/common/Modal";
import { useAppSelector } from "../../store/hooks";
import { ScenarioLoader } from "./ScenarioLoader";
import styles from "./LoadAnotherScenarioModal.module.css";

interface LoadAnotherScenarioModalProps {
  onClose: () => void;
}

/**
 * Loads a replacement scenario over the currently loaded one, for comparing
 * variants across multiple source files: save variants from scenario A,
 * open this to swap in scenario B, then save and compare variants from B
 * against the ones already saved from A. Reuses `ScenarioLoader` as-is (same
 * drag-drop/paste/preset flow as the initial empty-state loader) — the only
 * difference is this one replaces an *existing* baseline rather than setting
 * the first one, so `loadScenario` (below) still preserves `variants` the
 * same way it always has; the warning here is just informing the user of
 * that, not a different code path.
 */
export function LoadAnotherScenarioModal({ onClose }: LoadAnotherScenarioModalProps) {
  const variantCount = useAppSelector((s) => s.scenario.variants.length);

  return (
    <Modal title="Загрузить другой сценарий" onClose={onClose}>
      <p className={styles.warning}>
        Текущий сценарий и несохранённые изменения будут заменены загруженным файлом.
        {variantCount > 0 && (
          <>
            {" "}
            Сохранённые варианты (
            {variantCount}
            ) не удаляются — их можно будет сравнить с вариантами нового сценария в «Сравнении».
          </>
        )}
      </p>
      <ScenarioLoader onLoaded={onClose} />
    </Modal>
  );
}
