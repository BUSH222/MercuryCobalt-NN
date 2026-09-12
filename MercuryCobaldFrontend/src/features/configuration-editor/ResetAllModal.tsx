import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import styles from "./ResetAllModal.module.css";

interface ResetAllModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function ResetAllModal({ onConfirm, onClose }: ResetAllModalProps) {
  return (
    <Modal title="Сбросить всё?" onClose={onClose}>
      <p className={styles.text}>
        Будут удалены загруженный файл сценария, все внесённые изменения и все сохранённые варианты. Это позволит
        загрузить другой сценарий, но отменить сброс будет нельзя.
      </p>
      <div className={styles.actions}>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="danger"
          icon="trash"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Сбросить всё
        </Button>
      </div>
    </Modal>
  );
}
