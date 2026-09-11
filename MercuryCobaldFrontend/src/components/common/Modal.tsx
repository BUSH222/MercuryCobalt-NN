import type { ReactNode } from "react";
import { IconButton } from "./Chip";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <IconButton icon="close" title="Закрыть" onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
