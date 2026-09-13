import type {
  ClientLinkSample,
  CoverageCandidate,
  LinkAssumptions,
  ResultExport,
  Route,
  RoutingAlgorithmId,
  Scenario,
  SeriesResult,
} from "../domain";
import { DEFAULT_LINK_ASSUMPTIONS, DEFAULT_ROUTING_ALGORITHM, RESULT_SCHEMA_VERSION } from "../domain";
import type { EarthModel } from "../store/useUiStore";
import { applyAdvancedVisibility } from "../terrain";
import { computeSnapshot, timeGrid } from "../utils/geometry";
import { computeRoute } from "../utils/routing";
import { computeClientMetrics } from "../utils/metrics";
import { computeLinkSample, fillHandoverTiming } from "../utils/linkMetrics";
import { computeConstellationStepStats } from "../utils/constellationStats";
import { searchCoverageConfigurations, type CoverageSearchOptions } from "../utils/coverageOptimizer";
import { parseScenarioText, type ValidationResult } from "../utils/validation";

const SIMULATED_LATENCY_MS = 350;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ScenarioApi {
  loadScenarioFromText(text: string): Promise<ValidationResult>;
  computeSeries(
    scenario: Scenario,
    assumptions?: LinkAssumptions,
    earthModel?: EarthModel,
    routingAlgorithm?: RoutingAlgorithmId,
  ): Promise<SeriesResult>;
  buildResultExport(scenario: Scenario, series: SeriesResult): ResultExport;
  searchCoverage(scenario: Scenario, options?: CoverageSearchOptions): Promise<CoverageCandidate[]>;
}

function computeSeriesSync(
  scenario: Scenario,
  assumptions: LinkAssumptions,
  earthModel: EarthModel,
  routingAlgorithm: RoutingAlgorithmId,
): SeriesResult {
  const grid = timeGrid(scenario.environment);
  const rawSnapshots = grid.map((t) => computeSnapshot(scenario, t));
  // Basic mode: computeSnapshot's own visibility, completely untouched. Advanced
  // mode: override per ground site from its (already-warmed, see
  // useAdvancedTerrainSync.ts) horizon profile — a swap-in layer, not a rewrite
  // of computeSnapshot itself.
  const snapshots =
    earthModel === "advanced"
      ? rawSnapshots.map((snap) => applyAdvancedVisibility(snap, scenario.ground_sites))
      : rawSnapshots;

  const clients = scenario.ground_sites.filter((s) => s.role === "client");
  const routesByClient: Record<string, Route[]> = {};
  const samplesByClient: Record<string, ClientLinkSample[]> = {};

  for (const client of clients) {
    const routes = snapshots.map((snap) => computeRoute(scenario, snap, client, routingAlgorithm));
    routesByClient[client.id] = routes;
    const samples = routes.map((route, idx) => computeLinkSample(scenario, snapshots[idx]!, route, client, assumptions));
    fillHandoverTiming(samples);
    samplesByClient[client.id] = samples;
  }

  const perClientMetrics = clients.map((client) =>
    computeClientMetrics(client.id, samplesByClient[client.id]!, scenario.environment),
  );

  const constellationSteps = snapshots.map((snap, idx) => {
    const samplesAtT = clients.map((c) => samplesByClient[c.id]![idx]!);
    return computeConstellationStepStats(snap, samplesAtT);
  });

  return {
    computed_at: new Date().toISOString(),
    t_grid_s: grid,
    snapshots,
    routes_by_client: routesByClient,
    client_samples: samplesByClient,
    constellation_steps: constellationSteps,
    metrics: { target_availability: scenario.environment.target_availability, per_client: perClientMetrics },
  };
}

export const scenarioApi: ScenarioApi = {
  async loadScenarioFromText(text: string): Promise<ValidationResult> {
    return delay(parseScenarioText(text), 200);
  },

  async computeSeries(
    scenario: Scenario,
    assumptions: LinkAssumptions = DEFAULT_LINK_ASSUMPTIONS,
    earthModel: EarthModel = "basic",
    routingAlgorithm: RoutingAlgorithmId = DEFAULT_ROUTING_ALGORITHM,
  ): Promise<SeriesResult> {
    return delay(computeSeriesSync(scenario, assumptions, earthModel, routingAlgorithm), SIMULATED_LATENCY_MS);
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
      client_samples: series.client_samples,
    };
  },

  async searchCoverage(scenario: Scenario, options?: CoverageSearchOptions): Promise<CoverageCandidate[]> {
    return searchCoverageConfigurations(scenario, options);
  },
};
