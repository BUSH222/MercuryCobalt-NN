import type { ReactNode } from "react";
import type { IconName } from "../common/Icon";
import type { MainView } from "../../store/useUiStore";
import { EquirectangularMap } from "../MapView/EquirectangularMap";
import { PolarMap } from "../MapView/PolarMap";
import { RouteDetails } from "../RouteDetails/RouteDetails";
import { StatsView } from "../../features/availability-timeline/StatsView";
import { VariantComparison } from "../../features/variant-comparison/VariantComparison";

import { LazyGlobeMap } from "../MapView/LazyGlobeMap";

export interface ViewDef {
  id: MainView;
  label: string;
  icon: IconName;
  render: () => ReactNode;
}

/**
 * Single source of truth for every selectable panel: its bottom-bar chip
 * (label/icon) and its content. Both the bottom bar and the panel grid read
 * from this list so adding a view never means updating two switch statements.
 */
export const VIEW_DEFS: ViewDef[] = [
  { id: "map-equirect", label: "Карта (прямоугольная)", icon: "globe", render: () => <EquirectangularMap /> },
  { id: "map-polar", label: "Карта (полярная)", icon: "compass", render: () => <PolarMap /> },
  { id: "map-3d", label: "Карта (3D)", icon: "globe-3d", render: () => <LazyGlobeMap /> },
  { id: "stats", label: "Статистика", icon: "chart", render: () => <StatsView /> },
  { id: "compare", label: "Сравнение", icon: "compare", render: () => <VariantComparison /> },
  { id: "route", label: "Маршрут", icon: "route", render: () => <RouteDetails /> },
];

export function viewDef(id: MainView): ViewDef {
  const def = VIEW_DEFS.find((v) => v.id === id);
  if (!def) throw new Error(`Unknown view: ${id}`);
  return def;
}
