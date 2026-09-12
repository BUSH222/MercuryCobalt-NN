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
