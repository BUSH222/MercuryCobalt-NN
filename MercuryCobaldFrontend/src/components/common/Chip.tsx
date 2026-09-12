import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Spinner";
import styles from "./Chip.module.css";

interface ChipProps {
  icon?: IconName;
  label: ReactNode;
  active?: boolean;
  loading?: boolean;
  onClick?: () => void;
  title?: string;
}

export function Chip({ icon, label, active, loading, onClick, title }: ChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.active : ""}`}
      onClick={onClick}
      aria-pressed={active}
      title={title}
    >
      {loading ? <Spinner size={13} /> : icon && <Icon name={icon} />}
      <span>{label}</span>
    </button>
  );
}

interface IconButtonProps {
  icon: IconName;
  onClick?: () => void;
  title: string;
  active?: boolean;
}

export function IconButton({ icon, onClick, title, active }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${active ? styles.active : ""}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Icon name={icon} />
    </button>
  );
}
