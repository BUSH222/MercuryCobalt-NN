import type { Plane, Satellite } from "../../domain";
import { SliderField } from "../../components/common/SliderField";
import styles from "./PlanesEditor.module.css";

interface PlanesEditorProps {
  planes: Plane[];
  satellites: Satellite[];
  onChange: (planeId: string, patch: { raan_deg?: number; phase_deg?: number }) => void;
}

export function PlanesEditor({ planes, satellites, onChange }: PlanesEditorProps) {
  return (
    <div className={styles.list}>
      {planes.map((plane) => {
        const count = satellites.filter((s) => s.plane_id === plane.id).length;
        return (
          <div key={plane.id} className={styles.plane}>
            <div className={styles.planeHeader}>
              <span>{plane.id}</span>
              <span className={styles.badge}>{count} аппаратов</span>
            </div>
            <SliderField
              label="RAAN"
              value={plane.raan_deg}
              min={0}
              max={360}
              step={0.5}
              onChange={(v) => onChange(plane.id, { raan_deg: v })}
            />
            <SliderField
              label="Фазирование"
              value={plane.phase_deg}
              min={0}
              max={360}
              step={0.5}
              onChange={(v) => onChange(plane.id, { phase_deg: v })}
            />
          </div>
        );
      })}
    </div>
  );
}
