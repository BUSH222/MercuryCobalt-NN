import type { ReactNode } from "react";
import { Icon, type IconName } from "../common/Icon";
import { IconButton } from "../common/Chip";
import styles from "./PanelCard.module.css";

interface PanelCardProps {
  title: string;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
}

/** Chrome shown around a view only when it shares the screen with other open panels. */
export function PanelCard({ title, icon, onClose, children }: PanelCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Icon name={icon} size={14} />
          {title}
        </span>
        <IconButton icon="close" title={`Скрыть «${title}»`} onClick={onClose} />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
