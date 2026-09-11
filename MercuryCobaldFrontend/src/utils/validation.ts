/**
 * Runtime validation of an untrusted parsed-JSON value against the "cosmo-A-1.0"
 * scenario schema, per "Проверка входа" in "Описание данных": numeric values
 * must be finite, identifiers unique, plane/satellite references must resolve,
 * duration must be a positive multiple of the step, and every outage interval
 * must lie inside the computation horizon with positive length. Every failure
 * names the offending field or object rather than reporting a generic parse error.
 */
import { SCENARIO_SCHEMA_VERSION, type Scenario } from "../domain";

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { valid: true; scenario: Scenario }
  | { valid: false; errors: ValidationError[] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function validateScenario(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const err = (path: string, message: string): void => {
    errors.push({ path, message });
  };

  if (!isObject(raw)) {
    return { valid: false, errors: [{ path: "root", message: "Ожидался JSON-объект сценария" }] };
  }

  if (raw.schema_version !== SCENARIO_SCHEMA_VERSION) {
    err("schema_version", `Ожидалось значение "${SCENARIO_SCHEMA_VERSION}", получено ${JSON.stringify(raw.schema_version)}`);
  }

  const meta = raw.meta;
  if (!isObject(meta)) {
    err("meta", "Раздел meta отсутствует или не является объектом");
  } else {
    if (!isNonEmptyString(meta.id)) err("meta.id", "Не задан идентификатор сценария");
    if (!isNonEmptyString(meta.title)) err("meta.title", "Не задано название сценария");
  }

  const env = raw.environment;
  let stepS = 0;
  let horizonS = 0;
  if (!isObject(env)) {
    err("environment", "Раздел environment отсутствует или не является объектом");
  } else {
    const numericFields: (keyof Scenario["environment"])[] = [
      "altitude_km",
      "inclination_deg",
      "earth_angle0_deg",
      "horizon_s",
      "step_s",
      "min_elevation_deg",
      "isl_range_km",
      "target_availability",
    ];
    for (const field of numericFields) {
      if (!isFiniteNumber(env[field])) err(`environment.${field}`, "Значение должно быть конечным числом");
    }
    if (isFiniteNumber(env.step_s)) {
      stepS = env.step_s;
      if (!Number.isInteger(stepS) || stepS <= 0) err("environment.step_s", "Шаг должен быть целым положительным числом секунд");
    }
    if (isFiniteNumber(env.horizon_s)) {
      horizonS = env.horizon_s;
      if (!Number.isInteger(horizonS) || horizonS <= 0) err("environment.horizon_s", "Продолжительность должна быть целым положительным числом секунд");
    }
    if (stepS > 0 && horizonS > 0 && horizonS % stepS !== 0) {
      err("environment.horizon_s", "Продолжительность расчёта должна быть кратна шагу step_s");
    }
  }

  const design = raw.design;
  const planeIds = new Set<string>();
  const satelliteIds = new Set<string>();
  if (!isObject(design)) {
    err("design", "Раздел design отсутствует или не является объектом");
  } else {
    if (![1, 2, 3].includes(design.launch_stage as number)) {
      err("design.launch_stage", "Этап развёртывания должен быть 1, 2 или 3");
    }
    const planes = design.planes;
    if (!Array.isArray(planes) || planes.length === 0) {
      err("design.planes", "Список плоскостей должен быть непустым массивом");
    } else {
      planes.forEach((p: unknown, idx: number) => {
        const path = `design.planes[${idx}]`;
        if (!isObject(p)) { err(path, "Плоскость должна быть объектом"); return; }
        if (!isNonEmptyString(p.id)) err(`${path}.id`, "Не задан идентификатор плоскости");
        else if (planeIds.has(p.id)) err(`${path}.id`, `Повторяющийся идентификатор плоскости "${p.id}"`);
        else planeIds.add(p.id);
        if (!isFiniteNumber(p.raan_deg) || p.raan_deg < 0 || p.raan_deg >= 360) {
          err(`${path}.raan_deg`, "Значение должно быть числом в диапазоне [0, 360)");
        }
        if (!isFiniteNumber(p.phase_deg) || p.phase_deg < 0 || p.phase_deg >= 360) {
          err(`${path}.phase_deg`, "Значение должно быть числом в диапазоне [0, 360)");
        }
      });
    }

    const satellites = design.satellites;
    if (!Array.isArray(satellites) || satellites.length === 0) {
      err("design.satellites", "Список спутников должен быть непустым массивом");
    } else {
      satellites.forEach((s: unknown, idx: number) => {
        const path = `design.satellites[${idx}]`;
        if (!isObject(s)) { err(path, "Спутник должен быть объектом"); return; }
        if (!isNonEmptyString(s.id)) err(`${path}.id`, "Не задан идентификатор спутника");
        else if (satelliteIds.has(s.id)) err(`${path}.id`, `Повторяющийся идентификатор спутника "${s.id}"`);
        else satelliteIds.add(s.id);
        if (!isNonEmptyString(s.plane_id) || !planeIds.has(s.plane_id)) {
          err(`${path}.plane_id`, `Ссылка на несуществующую плоскость "${String(s.plane_id)}"`);
        }
        if (!isFiniteNumber(s.slot_deg)) err(`${path}.slot_deg`, "Значение должно быть конечным числом");
        if (![1, 2, 3].includes(s.launch_batch as number)) {
          err(`${path}.launch_batch`, "Очередь запуска должна быть 1, 2 или 3");
        }
      });
    }
  }

  const groundSites = raw.ground_sites;
  const groundSiteIds = new Set<string>();
  const gatewayIds = new Set<string>();
  if (!Array.isArray(groundSites) || groundSites.length === 0) {
    err("ground_sites", "Список наземных пунктов должен быть непустым массивом");
  } else {
    groundSites.forEach((g: unknown, idx: number) => {
      const path = `ground_sites[${idx}]`;
      if (!isObject(g)) { err(path, "Наземный пункт должен быть объектом"); return; }
      if (!isNonEmptyString(g.id)) err(`${path}.id`, "Не задан идентификатор наземного пункта");
      else if (groundSiteIds.has(g.id)) err(`${path}.id`, `Повторяющийся идентификатор наземного пункта "${g.id}"`);
      else if (satelliteIds.has(g.id)) err(`${path}.id`, `Идентификатор "${g.id}" совпадает с идентификатором спутника`);
      else groundSiteIds.add(g.id);
      if (!isNonEmptyString(g.name)) err(`${path}.name`, "Не задано название пункта");
      if (g.role !== "client" && g.role !== "gateway") err(`${path}.role`, 'Роль должна быть "client" или "gateway"');
      else if (g.role === "gateway" && isNonEmptyString(g.id)) gatewayIds.add(g.id);
      if (!isFiniteNumber(g.lat_deg) || g.lat_deg < -90 || g.lat_deg > 90) {
        err(`${path}.lat_deg`, "Широта должна быть числом в диапазоне [-90, 90]");
      }
      if (!isFiniteNumber(g.lon_deg) || g.lon_deg < -180 || g.lon_deg > 180) {
        err(`${path}.lon_deg`, "Долгота должна быть числом в диапазоне [-180, 180]");
      }
    });
  }

  const checkInterval = (path: string, startS: unknown, endS: unknown): void => {
    if (!isFiniteNumber(startS) || !isFiniteNumber(endS)) {
      err(path, "start_s и end_s должны быть конечными числами");
      return;
    }
    if (endS <= startS) err(path, "end_s должен быть больше start_s (положительная длительность)");
    if (startS < 0 || (horizonS > 0 && endS > horizonS)) {
      err(path, "Интервал должен целиком лежать внутри периода расчёта");
    }
  };

  const failures = raw.failures;
  if (!Array.isArray(failures)) {
    err("failures", "Список отказов должен быть массивом (пустой массив допустим)");
  } else {
    failures.forEach((f: unknown, idx: number) => {
      const path = `failures[${idx}]`;
      if (!isObject(f)) { err(path, "Событие отказа должно быть объектом"); return; }
      if (!isNonEmptyString(f.satellite_id) || !satelliteIds.has(f.satellite_id)) {
        err(`${path}.satellite_id`, `Ссылка на несуществующий спутник "${String(f.satellite_id)}"`);
      }
      checkInterval(path, f.start_s, f.end_s);
    });
  }

  const gatewayOutages = raw.gateway_outages;
  if (!Array.isArray(gatewayOutages)) {
    err("gateway_outages", "Список недоступности шлюзов должен быть массивом (пустой массив допустим)");
  } else {
    gatewayOutages.forEach((o: unknown, idx: number) => {
      const path = `gateway_outages[${idx}]`;
      if (!isObject(o)) { err(path, "Событие недоступности шлюза должно быть объектом"); return; }
      if (!isNonEmptyString(o.gateway_id) || !gatewayIds.has(o.gateway_id)) {
        err(`${path}.gateway_id`, `Ссылка на несуществующий шлюз "${String(o.gateway_id)}"`);
      }
      checkInterval(path, o.start_s, o.end_s);
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, scenario: raw as unknown as Scenario };
}

export function parseScenarioText(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Некорректный JSON";
    return { valid: false, errors: [{ path: "root", message: `Не удалось разобрать JSON: ${message}` }] };
  }
  return validateScenario(raw);
}
