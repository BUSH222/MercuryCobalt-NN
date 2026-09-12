import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 14 }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Загрузка"
    />
  );
}
