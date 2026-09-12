import { Icon } from "./Icon";
import type { ValidationError } from "../../utils/validation";
import styles from "./ErrorList.module.css";

interface ErrorListProps {
  headline: string;
  errors: ValidationError[];
}

export function ErrorList({ headline, errors }: ErrorListProps) {
  return (
    <div className={styles.banner} role="alert">
      <div className={styles.headline}>
        <Icon name="warning" />
        <span>{headline}</span>
      </div>
      <ul className={styles.list}>
        {errors.map((e, i) => (
          <li key={`${e.path}-${i}`}>
            <span className={styles.path}>{e.path}</span> — {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
