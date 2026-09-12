import { useState } from "react";
import type { Environment } from "../../domain";
import { validateScenario } from "../../utils/validation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateEnvironment } from "../../store/scenarioSlice";
import { Button } from "../common/Button";
import { ErrorList } from "../common/ErrorList";
import styles from "./SettingsPanel.module.css";

const FIELDS: { key: keyof Environment; label: string; step: number }[] = [
  { key: "altitude_km", label: "Высота орбиты, км", step: 10 },
  { key: "inclination_deg", label: "Наклонение, °", step: 0.1 },
  { key: "earth_angle0_deg", label: "Начальный угол Земли, °", step: 0.1 },
  { key: "horizon_s", label: "Горизонт расчёта, с", step: 1 },
  { key: "step_s", label: "Шаг расчёта, с", step: 1 },
  { key: "min_elevation_deg", label: "Мин. угол возвышения, °", step: 0.5 },
  { key: "isl_range_km", label: "Дальность ISL, км", step: 10 },
  { key: "target_availability", label: "Целевая доступность (0–1)", step: 0.01 },
];

/**
 * Unlike the export dialog's title/id (pure local state, only baked into the
 * downloaded file), the environment block is part of the actual scenario
 * physics — so edits here go through an explicit "Применить" action that
 * commits them as an override on the live scenario, gated by the same
 * validation the loader runs, rather than silently taking effect as typed.
 */
export function EnvironmentSettings() {
  const dispatch = useAppDispatch();
  const effectiveScenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const appliedKey = effectiveScenario ? JSON.stringify(effectiveScenario.environment) : null;
  const [draft, setDraft] = useState<Environment | null>(effectiveScenario?.environment ?? null);
  // Tracks which applied environment `draft` was last synced from. Compared
  // during render (not in an effect) so the reset happens in the same commit
  // as the change — see "Adjusting state when a prop changes" in the React
  // docs. Re-syncs only when the applied environment's content actually
  // changes (new file loaded, "Сбросить" reset, or our own successful apply)
  // — not on every unrelated override (RAAN, failures, …), which would wipe
  // whatever the user is mid-typing here.
  const [syncedKey, setSyncedKey] = useState(appliedKey);
  if (appliedKey !== syncedKey) {
    setSyncedKey(appliedKey);
    setDraft(effectiveScenario?.environment ?? null);
  }

  if (!effectiveScenario || !draft) return null;

  const candidate = { ...effectiveScenario, environment: draft };
  const validation = validateScenario(candidate);
  const errors = validation.valid ? [] : validation.errors.filter((e) => e.path.startsWith("environment"));
  const dirty = JSON.stringify(draft) !== appliedKey;

  function setField(key: keyof Environment, raw: string): void {
    setDraft((d) => (d ? { ...d, [key]: Number(raw) } : d));
  }

  return (
    <div className={styles.group}>
      <span className={styles.groupTitle}>Параметры окружения</span>
      <span className={styles.hint}>
        Часть схемы сценария (высота, наклонение, горизонт/шаг расчёта, дальность ISL и др.), а не отображаемая
        настройка. Изменения нужно подтвердить кнопкой ниже, а затем — как и любая другая конфигурация — повторно
        нажать «Запустить расчёт» в сайдбаре, чтобы увидеть результат.
      </span>
      {FIELDS.map(({ key, label, step }) => (
        <label key={key} className={styles.assumptionRow}>
          <span>{label}</span>
          <input
            type="number"
            className={styles.assumptionInput}
            step={step}
            value={draft[key]}
            onChange={(e) => setField(key, e.target.value)}
          />
        </label>
      ))}
      {errors.length > 0 && <ErrorList headline="Некорректные параметры окружения" errors={errors} />}
      <Button
        variant="primary"
        icon="check"
        disabled={!dirty || errors.length > 0}
        onClick={() => dispatch(updateEnvironment(draft))}
      >
        Применить изменения окружения
      </Button>
    </div>
  );
}
