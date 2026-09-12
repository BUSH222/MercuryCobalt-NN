/**
 * Types describing routes from a client ground site through the satellite mesh
 * to a gateway, and the reasons a route may be unavailable at a given instant
 * (per "Постановка задачи", section 3).
 */

export type NoRouteReason =
  | "no_visible_satellite"
  | "isl_mesh_broken"
  | "gateway_unreachable"
  | "gateway_down";

export const NO_ROUTE_REASON_LABEL: Record<NoRouteReason, string> = {
  no_visible_satellite: "Нет видимого спутника",
  isl_mesh_broken: "Разрыв межспутниковой сети",
  gateway_unreachable: "Нет контакта со шлюзом",
  gateway_down: "Шлюз недоступен",
};

export interface RouteNode {
  id: string;
  kind: "client" | "satellite" | "gateway";
}

export interface Route {
  t_s: number;
  client_id: string;
  gateway_id: string | null;
  /** Full ordered path of ids from client to gateway; empty when no route exists. */
  path: string[];
  nodes: RouteNode[];
  /** Number of edges in the path (two ground legs + ISL hops); absent when no path. */
  hop_count: number | null;
  reason: NoRouteReason | null;
}

/**
 * Selectable pathfinding strategies (see `utils/routing/`), per "Постановка
 * задачи" — the team is free to choose/replace the route search method, as
 * long as the underlying contact formulas from "Описание данных" are
 * respected. This is a UI-facing setting, not part of the scenario schema:
 * it lives in `useUiStore`, not in `Scenario`/`ConfigOverrides`.
 */
export type RoutingAlgorithmId = "shortest-distance" | "fewest-hops" | "widest-margin" | "greedy-baseline";

export const ROUTING_ALGORITHM_IDS: RoutingAlgorithmId[] = [
  "shortest-distance",
  "fewest-hops",
  "widest-margin",
  "greedy-baseline",
];

export const DEFAULT_ROUTING_ALGORITHM_ID: RoutingAlgorithmId = "shortest-distance";

export const ROUTING_ALGORITHM_LABEL: Record<RoutingAlgorithmId, string> = {
  "shortest-distance": "Кратчайшее расстояние",
  "fewest-hops": "Минимум переходов",
  "widest-margin": "Максимальная устойчивость",
  "greedy-baseline": "Жадный (бейзлайн)",
};

export const ROUTING_ALGORITHM_DESCRIPTION: Record<RoutingAlgorithmId, string> = {
  "shortest-distance":
    "Dijkstra по сумме физической длины пути (клиент → спутники → шлюз). Минимизирует суммарную дистанцию — прокси для минимальной задержки распространения сигнала. По умолчанию.",
  "fewest-hops":
    "Поиск в ширину (BFS) по числу переходов, без учёта физической длины рёбер. Минимизирует число промежуточных спутников — проще и надёжнее, когда задержка не критична.",
  "widest-margin":
    "Bottleneck-путь (модификация Dijkstra): максимизирует наименьший запас по порогу вдоль маршрута — по углу возвышения над min_elevation_deg на наземных участках и по дальности до isl_range_km на ISL-участках. Снижает риск обрыва маршрута при небольшом ухудшении геометрии.",
  "greedy-baseline":
    "Наивный жадный алгоритм: на каждом шаге выбирает ближайший ещё не посещённый узел, без возврата назад. Заведомо более слабый бейзлайн для сравнения — показывает, зачем нужны более умные алгоритмы.",
};

/** Per-instant metrics describing one already-found path, for comparing algorithms against each other. */
export interface RouteAlgorithmMetrics {
  algorithm_id: RoutingAlgorithmId;
  path: string[];
  hop_count: number;
  total_distance_km: number;
  /** Smallest normalized safety margin along the path (0..1), or null when the path has no edges to measure. */
  bottleneck_margin_ratio: number | null;
}
