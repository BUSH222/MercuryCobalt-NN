import styles from "./Legend.module.css";

export function Legend({ showAllIsl }: { showAllIsl: boolean }) {
  return (
    <div className={styles.legend}>
      <span className={styles.item}>
        <span className={styles.dot} style={{ background: "#6fa8ff" }} />
        Спутник активен
      </span>
      <span className={styles.item}>
        <span className={styles.dot} style={{ background: "#3c4759" }} />
        Спутник неактивен (отказ/не запущен)
      </span>
      <span className={styles.item}>
        <span className={styles.dot} style={{ background: "#ff9f45" }} />
        На текущем маршруте
      </span>
      <span className={styles.item}>
        <span className={styles.dot} style={{ background: "#4fd1c5" }} />
        Клиентский пункт
      </span>
      <span className={styles.item}>
        <span className={styles.ring} style={{ borderColor: "#ff9f45" }} />
        Шлюз
      </span>
      <span className={styles.item}>
        <span className={styles.line} style={{ background: "#ff9f45" }} />
        Маршрут
      </span>
      {showAllIsl && (
        <span className={styles.item}>
          <span className={styles.line} style={{ background: "#4a5b78" }} />
          Межспутниковая связь (ISL)
        </span>
      )}
    </div>
  );
}
