import { IconButton } from "../common/Chip";
import { formatTime, type TimeDisplayUnit } from "../../utils/time";
import styles from "./TimeScrubber.module.css";

interface TimeScrubberProps {
  tGrid: number[];
  timeIndex: number;
  onChange: (index: number) => void;
  timeUnit: TimeDisplayUnit;
}

export function TimeScrubber({ tGrid, timeIndex, onChange, timeUnit }: TimeScrubberProps) {
  const last = Math.max(0, tGrid.length - 1);
  const currentT = tGrid[timeIndex] ?? 0;

  return (
    <div className={styles.wrap}>
      <IconButton icon="chevron-left" title="Предыдущий отсчёт" onClick={() => onChange(Math.max(0, timeIndex - 1))} />
      <span className={styles.time}>{formatTime(currentT, timeUnit)}</span>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={last}
        step={1}
        value={timeIndex}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Момент расчёта"
      />
      <IconButton icon="chevron-right" title="Следующий отсчёт" onClick={() => onChange(Math.min(last, timeIndex + 1))} />
      <span className={styles.step}>
        {timeIndex + 1} / {tGrid.length}
      </span>
    </div>
  );
}
