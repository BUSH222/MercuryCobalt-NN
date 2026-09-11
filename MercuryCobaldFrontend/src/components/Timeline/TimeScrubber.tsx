import { useEffect, useRef, useState } from "react";
import { IconButton } from "../common/Chip";
import { formatTime, type TimeDisplayUnit } from "../../utils/time";
import styles from "./TimeScrubber.module.css";

interface TimeScrubberProps {
  tGrid: number[];
  timeIndex: number;
  onChange: (index: number) => void;
  timeUnit: TimeDisplayUnit;
}

/**
 * The thumb/label track the raw input on every native "input" event (which
 * can fire far faster than the map can usefully redraw), but the expensive
 * `onChange` — which triggers a snapshot lookup and a full map/route
 * re-render — is coalesced to at most once per animation frame. Dragging
 * fast no longer floods React with more commits than the browser can paint,
 * which is what made ISL edges and routes appear to jump erratically.
 */
export function TimeScrubber({ tGrid, timeIndex, onChange, timeUnit }: TimeScrubberProps) {
  const last = Math.max(0, tGrid.length - 1);
  const [displayIndex, setDisplayIndex] = useState(timeIndex);
  const [lastSeenIndex, setLastSeenIndex] = useState(timeIndex);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  // Adjust local display state during render when the committed index moves
  // externally (prev/next buttons, gantt seek) — see React's guidance on
  // adjusting state from props instead of syncing it in an effect.
  if (timeIndex !== lastSeenIndex) {
    setLastSeenIndex(timeIndex);
    setDisplayIndex(timeIndex);
  }

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const handleInput = (value: number): void => {
    setDisplayIndex(value);
    pendingRef.current = value;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingRef.current !== null) onChange(pendingRef.current);
    });
  };

  const currentT = tGrid[displayIndex] ?? 0;

  return (
    <div className={styles.wrap}>
      <IconButton icon="chevron-left" title="Предыдущий отсчёт" onClick={() => handleInput(Math.max(0, displayIndex - 1))} />
      <span className={styles.time}>{formatTime(currentT, timeUnit)}</span>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={last}
        step={1}
        value={displayIndex}
        onChange={(e) => handleInput(Number(e.target.value))}
        aria-label="Момент расчёта"
      />
      <IconButton
        icon="chevron-right"
        title="Следующий отсчёт"
        onClick={() => handleInput(Math.min(last, displayIndex + 1))}
      />
      <span className={styles.step}>
        {displayIndex + 1} / {tGrid.length}
      </span>
    </div>
  );
}
