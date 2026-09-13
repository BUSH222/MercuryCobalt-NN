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

/**
 * Selectable pathfinding strategies for building a route from a client ground
 * site to a gateway — see `utils/routing/`, one file per strategy behind a
 * shared interface. A UI/computation setting (`useUiStore`), not scenario
 * data: choosing one never changes *whether* a route exists at a given
 * instant, only *which* valid path among the existing ones is reported.
 */
export type RoutingAlgorithmId = "shortest-distance" | "fewest-hops" | "widest-margin" | "greedy-nearest";

/** Default per "Постановка задачи": minimum physical distance, a proxy for minimum propagation delay. */
export const DEFAULT_ROUTING_ALGORITHM: RoutingAlgorithmId = "shortest-distance";

/** Display order for the settings picker and the comparison table. */
export const ROUTING_ALGORITHM_IDS: RoutingAlgorithmId[] = [
  "shortest-distance",
  "fewest-hops",
  "widest-margin",
  "greedy-nearest",
];

export const ROUTING_ALGORITHM_LABEL: Record<RoutingAlgorithmId, string> = {
  "shortest-distance": "Кратчайшее расстояние",
  "fewest-hops": "Минимум переходов",
  "widest-margin": "Максимальная устойчивость",
  "greedy-nearest": "Жадный (ближайший сосед)",
};

export const ROUTING_ALGORITHM_DESCRIPTION: Record<RoutingAlgorithmId, string> = {
  "shortest-distance":
    "Дейкстра по сумме физических дистанций рёбер маршрута — минимизирует длину пути, прокси минимальной задержки распространения сигнала.",
  "fewest-hops":
    "Поиск в ширину (BFS) по графу активных ISL-связей — игнорирует физическую длину, минимизирует число промежуточных спутников.",
  "widest-margin":
    "Путь с максимальным запасом на самом слабом звене (widest path): для наземных участков — запас угла места над порогом видимости, для ISL — запас дальности до предела связи. Минимизирует риск, что маршрут развалится при небольшом ухудшении геометрии.",
  "greedy-nearest":
    "Заведомо более слабый бейзлайн для сравнения: на каждом шаге без просмотра вперёд и без возврата назад выбирает физически ближайший ещё не посещённый узел — может не найти маршрут там, где другие алгоритмы находят.",
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
  /** Which strategy produced this route — stamped by `computeRoute`'s dispatcher, not by the individual strategies themselves. */
  algorithm: RoutingAlgorithmId;
}
