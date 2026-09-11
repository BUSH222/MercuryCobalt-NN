import { useCallback, useRef } from "react";
import styles from "./RangeSlider.module.css";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatTick?: (value: number) => string;
}

/**
 * Dual-handle range slider used to select a failure's [start_s, end_s) window
 * directly on a time axis, as an alternative to typing the two numbers.
 */
export function RangeSlider({ min, max, step, value, onChange, formatTick }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [start, end] = value;

  const toFraction = (v: number): number => (v - min) / (max - min);
  const fromClientX = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return min;
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + fraction * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step],
  );

  function startDrag(which: "start" | "end") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      const move = (ev: PointerEvent): void => {
        const next = fromClientX(ev.clientX);
        if (which === "start") onChange([Math.min(next, end - step), end]);
        else onChange([start, Math.max(next, start + step)]);
      };
      const up = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const startPct = toFraction(start) * 100;
  const endPct = toFraction(end) * 100;

  return (
    <div>
      <div className={styles.track} ref={trackRef}>
        <div className={styles.rail} />
        <div className={styles.selection} style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
        <div
          className={styles.thumb}
          style={{ left: `${startPct}%` }}
          onPointerDown={startDrag("start")}
          role="slider"
          aria-label="Начало периода"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={start}
          tabIndex={0}
        />
        <div
          className={styles.thumb}
          style={{ left: `${endPct}%` }}
          onPointerDown={startDrag("end")}
          role="slider"
          aria-label="Конец периода"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={end}
          tabIndex={0}
        />
      </div>
      {formatTick && (
        <div className={styles.ticks}>
          <span>{formatTick(min)}</span>
          <span>{formatTick(max)}</span>
        </div>
      )}
    </div>
  );
}
