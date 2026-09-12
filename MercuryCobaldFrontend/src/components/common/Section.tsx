import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  title: string;
  children: ReactNode;
  /** Pins the section to the bottom of its scrolling ancestor while scrolling, docking in flow at the true end. */
  sticky?: boolean;
  /** Optional `data-tour-id`, used by the onboarding tour to target this section. */
  tourId?: string;
}

export function Section({ title, children, sticky, tourId }: SectionProps) {
  return (
    <div className={`${styles.section} ${sticky ? styles.sticky : ""}`} data-tour-id={tourId}>
      <span className={styles.title}>{title}</span>
      {children}
    </div>
  );
}
