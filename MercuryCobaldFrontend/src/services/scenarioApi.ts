/**
 * Data-access boundary for the whole app. Every call is async and returns the
 * same shapes a real backend would (validation errors keyed by field, a
 * computed SeriesResult, an export document) so that swapping the body of
 * each method for a `fetch(...)` call is the only change needed to attach a
 * real computation service later. For now every method is backed by the
 * client-side geometry engine in `utils/` plus an artificial network delay.
 */
import type { ResultExport, Scenario, SeriesResult, Route } from "../domain";
import { RESULT_SCHEMA_VERSION } from "../domain";
import { computeSnapshot, timeGrid } from "../utils/geometry";
import { computeRoute } from "../utils/routing";
import { computeClientMetrics } from "../utils/metrics";
import { parseScenarioText, type ValidationResult } from "../utils/validation";

const SIMULATED_LATENCY_MS = 350;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ScenarioApi {
  loadScenarioFromText(text: string): Promise<ValidationResult>;
  computeSeries(scenario: Scenario): Promise<SeriesResult>;
  buildResultExport(scenario: Scenario, series: SeriesResult): ResultExport;
}

function computeSeriesSync(scenario: Scenario): SeriesResult {
  const grid = timeGrid(scenario.environment);
  const snapshots = grid.map((t) => computeSnapshot(scenario, t));

  const clients = scenario.ground_sites.filter((s) => s.role === "client");
  const routesByClient: Record<string, Route[]> = {};
  for (const client of clients) {
    routesByClient[client.id] = snapshots.map((snap) => computeRoute(scenario, snap, client));
  }

  const perClientMetrics = clients.map((client) => {
    const routes = routesByClient[client.id]!;
    const visibilityFlags = snapshots.map(
      (snap) => (snap.elevation_deg[client.id] ?? []).some((e) => e.visible),
    );
    return computeClientMetrics(client.id, routes, visibilityFlags, scenario.environment);
  });

  return {
    computed_at: new Date().toISOString(),
    t_grid_s: grid,
    snapshots,
    routes_by_client: routesByClient,
    metrics: { target_availability: scenario.environment.target_availability, per_client: perClientMetrics },
  };
}

export const scenarioApi: ScenarioApi = {
  async loadScenarioFromText(text: string): Promise<ValidationResult> {
    return delay(parseScenarioText(text), 200);
  },

  async computeSeries(scenario: Scenario): Promise<SeriesResult> {
    return delay(computeSeriesSync(scenario), SIMULATED_LATENCY_MS);
  },

  buildResultExport(scenario: Scenario, series: SeriesResult): ResultExport {
    const routes = series.t_grid_s.flatMap((t, idx) =>
      Object.entries(series.routes_by_client).map(([clientId, routes]) => ({
        t_s: t,
        client_id: clientId,
        path: routes[idx]?.path ?? [],
      })),
    );
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      effective_scenario: scenario,
      routes,
      metrics: series.metrics,
    };
  },
};
