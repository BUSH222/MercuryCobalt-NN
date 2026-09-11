import { useState } from "react";
import type { Environment, Satellite, SatelliteFailure } from "../../domain";
import { RangeSlider } from "../../components/common/RangeSlider";
import { Button } from "../../components/common/Button";
import { IconButton } from "../../components/common/Chip";
import { formatTime } from "../../utils/time";
import styles from "./FailuresEditor.module.css";

interface FailuresEditorProps {
  satellites: Satellite[];
  environment: Environment;
  failures: SatelliteFailure[];
  onAdd: (failure: SatelliteFailure) => void;
  onRemove: (index: number) => void;
}

export function FailuresEditor({ satellites, environment, failures, onAdd, onRemove }: FailuresEditorProps) {
  const [satelliteId, setSatelliteId] = useState(satellites[0]?.id ?? "");
  const [range, setRange] = useState<[number, number]>([0, Math.min(3600, environment.horizon_s)]);

  const step = environment.step_s;
  const horizon = environment.horizon_s;

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>Спутник</span>
        <select className={styles.select} value={satelliteId} onChange={(e) => setSatelliteId(e.target.value)}>
          {satellites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Период недоступности (выделите на шкале)</span>
        <RangeSlider
          min={0}
          max={horizon}
          step={step}
          value={range}
          onChange={setRange}
          formatTick={(v) => formatTime(v, "hms")}
        />
        <div className={styles.numbers}>
          <div>
            <div className={styles.smallLabel}>start_s</div>
            <input
              type="number"
              className={styles.numberInput}
              min={0}
              max={range[1] - step}
              step={step}
              value={range[0]}
              onChange={(e) => setRange([Number(e.target.value), range[1]])}
            />
          </div>
          <div>
            <div className={styles.smallLabel}>end_s</div>
            <input
              type="number"
              className={styles.numberInput}
              min={range[0] + step}
              max={horizon}
              step={step}
              value={range[1]}
              onChange={(e) => setRange([range[0], Number(e.target.value)])}
            />
          </div>
        </div>
      </div>

      <Button
        icon="plus"
        disabled={!satelliteId || range[1] <= range[0]}
        onClick={() => {
          onAdd({ satellite_id: satelliteId, start_s: range[0], end_s: range[1] });
        }}
      >
        Добавить отказ
      </Button>

      <div className={styles.list}>
        {failures.length === 0 && <span className={styles.empty}>Отказы не заданы</span>}
        {failures.map((f, idx) => (
          <div key={`${f.satellite_id}-${f.start_s}-${idx}`} className={styles.item}>
            <div className={styles.itemMeta}>
              <span className={styles.itemId}>{f.satellite_id}</span>
              <span className={styles.itemRange}>
                {formatTime(f.start_s, "hms")} – {formatTime(f.end_s, "hms")}
              </span>
            </div>
            <IconButton icon="trash" title="Удалить отказ" onClick={() => onRemove(idx)} />
          </div>
        ))}
      </div>
    </div>
  );
}
