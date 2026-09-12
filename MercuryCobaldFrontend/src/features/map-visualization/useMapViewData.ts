import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectClient as selectClientAction, setTimeIndex as setTimeIndexAction } from "../../store/scenarioSlice";
import { useUiStore } from "../../store/useUiStore";
import { computeRoute } from "../../utils/routing";
import { computeLinkSample } from "../../utils/linkMetrics";
import { computeRouteKarmanBreaches } from "../../utils/karmanLineCheck";

/**
 * Shared read model for both map projections: the current snapshot and route
 * for the selected instant/client, plus the edge list to highlight. Kept as a
 * single hook so the equirectangular and polar views stay in lockstep and
 * never duplicate the derivation logic (only the projection differs between them).
 *
 * Unlike `snapshot` (satellite geometry — expensive, only refreshed by
 * "Запустить расчёт"), `route`/`linkSample` for the *currently displayed*
 * instant+client are recomputed live here rather than read from `series`, so
 * switching the routing algorithm in settings updates the map/route panel
 * immediately without forcing a full series recompute. `series` itself keeps
 * whichever algorithm was selected at the last "Запустить расчёт" — that's
 * what Статистика/Сравнение read, and it stays consistent with a fresh run.
 */
export function useMapViewData() {
  const dispatch = useAppDispatch();
  const scenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const series = useAppSelector((s) => s.scenario.series);
  const timeIndex = useAppSelector((s) => s.scenario.timeIndex);
  const selectedClientId = useAppSelector((s) => s.scenario.selectedClientId);
  const showAllIsl = useUiStore((s) => s.showAllIsl);
  const setShowAllIsl = useUiStore((s) => s.setShowAllIsl);
  const timeUnit = useUiStore((s) => s.timeUnit);
  const routingAlgorithm = useUiStore((s) => s.routingAlgorithm);
  const linkAssumptions = useUiStore((s) => s.linkAssumptions);

  const setTimeIndex = (index: number): void => {
    dispatch(setTimeIndexAction(index));
  };
  const selectClient = (id: string | null): void => {
    dispatch(selectClientAction(id));
  };

  const clients = useMemo(() => scenario?.ground_sites.filter((g) => g.role === "client") ?? [], [scenario]);
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  const snapshot = series?.snapshots[timeIndex] ?? null;

  const route = useMemo(() => {
    if (!scenario || !snapshot || !selectedClient) return null;
    return computeRoute(scenario, snapshot, selectedClient, routingAlgorithm);
  }, [scenario, snapshot, selectedClient, routingAlgorithm]);

  const linkSample = useMemo(() => {
    if (!scenario || !snapshot || !selectedClient || !route) return null;
    return computeLinkSample(scenario, snapshot, route, selectedClient, linkAssumptions);
  }, [scenario, snapshot, selectedClient, route, linkAssumptions]);

  const karmanBreaches = useMemo(() => computeRouteKarmanBreaches(route, snapshot), [route, snapshot]);

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
    karmanBreaches,
    clients,
    selectedClientId,
    selectedClient,
    selectClient,
    timeIndex,
    setTimeIndex,
    tGrid: series?.t_grid_s ?? [],
    routeEdgePairs,
    routeNodeIds,
    showAllIsl,
    setShowAllIsl,
    timeUnit,
    routingAlgorithm,
  };
}
