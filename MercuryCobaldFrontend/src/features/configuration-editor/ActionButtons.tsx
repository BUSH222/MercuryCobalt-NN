import { useState } from "react";
import { Button } from "../../components/common/Button";
import { ResetAllModal } from "./ResetAllModal";
import styles from "./ActionButtons.module.css";

interface ActionButtonsProps {
  computing: boolean;
  variantCount: number;
  onRunComputation: () => void;
  onSaveVariant: (name: string) => void;
  onReset: () => void;
  onResetAll: () => void;
}

export function ActionButtons({
  computing,
  variantCount,
  onRunComputation,
  onSaveVariant,
  onReset,
  onResetAll,
}: ActionButtonsProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);

  return (
    <div className={styles.wrap}>
      <Button variant="primary" icon="play" disabled={computing} onClick={onRunComputation}>
        {computing ? "Идёт расчёт…" : "Запустить расчёт"}
      </Button>

      {!naming ? (
        <Button
          icon="check"
          onClick={() => {
            setName(`Вариант ${variantCount + 1}`);
            setNaming(true);
          }}
        >
          Сохранить вариант
        </Button>
      ) : (
        <div className={styles.saveRow}>
          <input
            className={styles.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название варианта"
            autoFocus
          />
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => {
              onSaveVariant(name.trim());
              setNaming(false);
            }}
          >
            OK
          </Button>
        </div>
      )}

      <div className={styles.row}>
        <Button icon="reset" variant="ghost" onClick={onReset}>
          Сбросить изменения
        </Button>
        <Button icon="trash" variant="danger" onClick={() => setConfirmingResetAll(true)}>
          Сбросить всё
        </Button>
      </div>

      {confirmingResetAll && (
        <ResetAllModal onConfirm={onResetAll} onClose={() => setConfirmingResetAll(false)} />
      )}
    </div>
  );
}
