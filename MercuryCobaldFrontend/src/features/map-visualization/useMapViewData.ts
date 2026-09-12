import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectClient as selectClientAction, setTimeIndex as setTimeIndexAction } from "../../store/scenarioSlice";
import { useUiStore } from "../../store/useUiStore";
import { DEFAULT_SIM_DATE } from "../../domain";
import { sunDirectionEci, sunDirectionEcefAt } from "../../utils/sun";

/**
 * Shared read model for both map projections: the current snapshot and route
 * for the selected instant/client, plus the edge list to highlight. Kept as a
 * single hook so the equirectangular and polar views stay in lockstep and
 * never duplicate the derivation logic (only the projection differs between them).
 */
export function useMapViewData() {
  const dispatch = useAppDispatch();
  const scenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const series = useAppSelector((s) => s.scenario.series);
  const timeIndex = useAppSelector((s) => s.scenario.timeIndex);
  const selectedClientId = useAppSelector((s) => s.scenario.selectedClientId);
  const simDate = useAppSelector((s) => s.scenario.overrides.sim_date ?? DEFAULT_SIM_DATE);
  const showAllIsl = useUiStore((s) => s.showAllIsl);
  const setShowAllIsl = useUiStore((s) => s.setShowAllIsl);
  const timeUnit = useUiStore((s) => s.timeUnit);

  const setTimeIndex = (index: number): void => {
    dispatch(setTimeIndexAction(index));
  };
  const selectClient = (id: string | null): void => {
    dispatch(selectClientAction(id));
  };

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

  // The Sun's Earth-fixed direction at the currently displayed instant, for
  // the terminator overlay — recomputed only when the date, the scenario's
  // earth_angle0_deg, or the displayed instant actually changes, not on
  // every render while scrubbing through an unrelated prop update.
  const earthAngle0Deg = scenario?.environment.earth_angle0_deg;
  const snapshotT = snapshot?.t_s;
  const sunEcef = useMemo(() => {
    if (earthAngle0Deg === undefined || snapshotT === undefined) return null;
    const uEci = sunDirectionEci(simDate, earthAngle0Deg);
    return sunDirectionEcefAt(uEci, earthAngle0Deg, snapshotT);
  }, [simDate, earthAngle0Deg, snapshotT]);

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
    sunEcef,
  };
}
