import type { ReactNode } from "react";
import styles from "./Section.module.css";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.title}>{title}</span>
      {children}
    </div>
  );
}
