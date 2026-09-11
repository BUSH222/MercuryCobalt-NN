import styles from "./SliderField.module.css";

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** A range slider kept in sync with a numeric input, e.g. for RAAN/phase editing (0–360°). */
export function SliderField({ label, value, min, max, step = 1, unit = "°", onChange }: SliderFieldProps) {
  const clamp = (v: number): number => Math.min(max, Math.max(min, v));

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <div className={styles.controls}>
        <input
          type="range"
          className={styles.slider}
          min={min}
          max={max - step}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label={label}
        />
        <input
          type="number"
          className={styles.number}
          min={min}
          max={max - step}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed)) onChange(clamp(parsed));
          }}
          aria-label={`${label} (число)`}
        />
      </div>
    </div>
  );
}
