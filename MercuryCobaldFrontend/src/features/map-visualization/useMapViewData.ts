import { useMemo } from "react";
import { useScenarioStore } from "../../store/useScenarioStore";
import { useUiStore } from "../../store/useUiStore";

/**
 * Shared read model for both map projections: the current snapshot and route
 * for the selected instant/client, plus the edge list to highlight. Kept as a
 * single hook so the equirectangular and polar views stay in lockstep and
 * never duplicate the derivation logic (only the projection differs between them).
 */
export function useMapViewData() {
  const scenario = useScenarioStore((s) => s.effectiveScenario);
  const series = useScenarioStore((s) => s.series);
  const timeIndex = useScenarioStore((s) => s.timeIndex);
  const setTimeIndex = useScenarioStore((s) => s.setTimeIndex);
  const selectedClientId = useScenarioStore((s) => s.selectedClientId);
  const selectClient = useScenarioStore((s) => s.selectClient);
  const showAllIsl = useUiStore((s) => s.showAllIsl);
  const setShowAllIsl = useUiStore((s) => s.setShowAllIsl);
  const timeUnit = useUiStore((s) => s.timeUnit);

  const clients = useMemo(() => scenario?.ground_sites.filter((g) => g.role === "client") ?? [], [scenario]);
  const snapshot = series?.snapshots[timeIndex] ?? null;
  const route = selectedClientId ? (series?.routes_by_client[selectedClientId]?.[timeIndex] ?? null) : null;
  const linkSample = selectedClientId ? (series?.client_samples[selectedClientId]?.[timeIndex] ?? null) : null;

  const routeEdgePairs = useMemo<[string, string][]>(() => {
    if (!route || route.path.length < 2) return [];
    const pairs: [string, string][] = [];
    for (let i = 0; i < route.path.length - 1; i++) pairs.push([route.path[i]!, route.path[i + 1]!]);
    return pairs;
  }, [route]);

  const routeNodeIds = useMemo(() => new Set(route?.path ?? []), [route]);

  return {
    scenario,
    series,
    snapshot,
    route,
    linkSample,
    clients,
    selectedClientId,
    selectClient,
    timeIndex,
    setTimeIndex,
    tGrid: series?.t_grid_s ?? [],
    routeEdgePairs,
    routeNodeIds,
    showAllIsl,
    setShowAllIsl,
    timeUnit,
  };
}
