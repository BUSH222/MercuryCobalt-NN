import type { LaunchStage, Satellite } from "../../domain";
import styles from "./LaunchStageControl.module.css";

const STAGES: LaunchStage[] = [1, 2, 3];

interface LaunchStageControlProps {
  satellites: Satellite[];
  value: LaunchStage;
  onChange: (stage: LaunchStage) => void;
}

export function LaunchStageControl({ satellites, value, onChange }: LaunchStageControlProps) {
  return (
    <div className={styles.segments} role="radiogroup" aria-label="Этап развёртывания (launch_stage)">
      {STAGES.map((stage) => {
        const activeCount = satellites.filter((s) => s.launch_batch <= stage).length;
        return (
          <button
            key={stage}
            type="button"
            role="radio"
            aria-checked={value === stage}
            className={`${styles.segment} ${value === stage ? styles.active : ""}`}
            onClick={() => onChange(stage)}
          >
            <span className={styles.stage}>Очередь {stage}</span>
            <span className={styles.count}>до {activeCount} аппаратов</span>
          </button>
        );
      })}
    </div>
  );
}
