# Формат данных

Типы определены в
[`src/domain/scenario.ts`](../../MercuryCobalt-NN/MercuryCobaldFrontend/src/domain/scenario.ts),
[`result.ts`](../../MercuryCobalt-NN/MercuryCobaldFrontend/src/domain/result.ts)
и [`metrics.ts`](../../MercuryCobalt-NN/MercuryCobaldFrontend/src/domain/metrics.ts).
Четыре готовых примера лежат в
[`src/mocks/presets/`](../../MercuryCobalt-NN/MercuryCobaldFrontend/src/mocks/presets/).

## Входной сценарий — `cosmo-A-1.0`

```json
{
  "schema_version": "cosmo-A-1.0",
  "meta": { "id": "01_full_constellation", "title": "Полная группировка" },
  "environment": {
    "altitude_km": 550.0,
    "inclination_deg": 87.0,
    "earth_angle0_deg": 12.0,
    "horizon_s": 86400,
    "step_s": 120,
    "min_elevation_deg": 10.0,
    "isl_range_km": 3000.0,
    "target_availability": 0.9
  },
  "design": {
    "launch_stage": 3,
    "planes": [{ "id": "P1", "raan_deg": 0.0, "phase_deg": 0.0 }],
    "satellites": [
      { "id": "S01", "plane_id": "P1", "slot_deg": 0.0, "launch_batch": 1 }
    ]
  },
  "ground_sites": [
    { "id": "MUR", "name": "Мурманск", "role": "client", "lat_deg": 68.97, "lon_deg": 33.09 },
    { "id": "MOW", "name": "Москва", "role": "gateway", "lat_deg": 55.75, "lon_deg": 37.62 }
  ],
  "failures": [
    { "satellite_id": "S03", "start_s": 21600, "end_s": 43200 }
  ],
  "gateway_outages": []
}
```

| Поле | Смысл |
|---|---|
| `environment.horizon_s` / `step_s` | Горизонт расчёта и шаг сетки времени (720 отсчётов по умолчанию: 86400 / 120). `horizon_s` должен делиться на `step_s` нацело. |
| `environment.min_elevation_deg` | Порог угла места для **базовой** (сферической) модели видимости; не используется в «Продвинутом» режиме. |
| `environment.isl_range_km` | Максимальная дальность межспутниковой связи. |
| `environment.target_availability` | Целевая доля доступности на пункт (0–1), с которой сравнивается результат. |
| `design.launch_stage` | Текущая очередь запуска (1–3) — фильтрует, какие спутники уже активны по `launch_batch`. |
| `design.planes[].raan_deg` / `phase_deg` | Долгота восходящего узла и фазовый сдвиг плоскости — оси, которыми управляет [подбор конфигурации на покрытие](./algorithms.md#подбор-конфигурации-на-покрытие). |
| `ground_sites[].role` | `client` (наземный пункт, для которого считается доступность) или `gateway` (шлюз, до которого ищется маршрут). |
| `failures` | Интервалы отказа спутника `[start_s, end_s)`. |
| `gateway_outages` | Интервалы недоступности шлюза. |

Валидация (`utils/validation.ts`) проверяет конечность чисел, уникальность
идентификаторов, разрешимость ссылок `plane_id`/`satellite_id`, кратность
`horizon_s` шагу `step_s` и корректность интервалов отказов. При ошибке
возвращается путь до проблемного поля (например,
`design.satellites[3].plane_id`), а не общее «невалидный JSON».

## Экспортируемый результат — `cosmo-A-result-1.0`

```ts
interface ResultExport {
  schema_version: "cosmo-A-result-1.0";
  effective_scenario: Scenario;       // baseline + применённые overrides
  routes: RouteRecord[];              // { t_s, client_id, path: string[] }
  metrics?: SeriesMetrics;            // агрегаты по каждому клиенту, см. ниже
  client_samples?: Record<string, ClientLinkSample[]>;
  notes?: string;
}
```

`SeriesMetrics.per_client[]` — по одной записи на наземный пункт-клиент:

| Поле | Смысл |
|---|---|
| `visibility_fraction` / `availability_fraction` | Доля отсчётов с видимым спутником / с полным маршрутом до шлюза. |
| `available_tick_count` / `total_tick_count` | Те же доли, но в виде дроби тиков (например, 435/720) — нагляднее голого процента. |
| `meets_target_availability` | Сравнение `availability_fraction` с `environment.target_availability`. |
| `max_outage_s` / `total_downtime_s` / `outage_runs` / `outage_count` | Самый длинный и суммарный перерыв, список интервалов простоя, их число. |
| `min_hop_count` / `max_hop_count` | Диапазон длины маршрута (число переходов) за горизонт. |
| `mean_rtt_ms` / `p95_rtt_ms` / `jitter_ms` | Средняя/95-й перцентиль задержка и джиттер (среднее абсолютное изменение RTT между соседними связанными отсчётами). |
| `handover_count` | Число смен обслуживающего спутника без потери связи. |

Экспортируется сам изменённый сценарий (`effective_scenario`) в исходном
формате `cosmo-A-1.0` — файл готов к повторной загрузке в приложение.

## Условное обозначение временной сетки

Расчёт всегда выполняется на всех отсчётах `t = 0, step_s, 2·step_s, ...,
horizon_s − step_s` (720 отсчётов при значениях по умолчанию). Все метрики
доступности приведены к этой сетке, а не к произвольным меткам времени.
