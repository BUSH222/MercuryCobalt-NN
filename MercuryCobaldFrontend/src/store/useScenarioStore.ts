/**
 * Central application state: the loaded scenario, the user's pending
 * configuration overrides, the last computed series, and saved variants for
 * comparison. Scenario/computation data lives only here (in memory) — never
 * in localStorage, per project rules. Editing configuration (launch stage,
 * plane RAAN/phase, failures) updates `effectiveScenario` immediately so the
 * sidebar always reflects the pending configuration, but `series` (and
 * therefore the map/timeline) only refreshes when `runComputation` runs, so
 * "Запустить расчёт" stays a deliberate, explainable action.
 */
import { create } from "zustand";
import type {
  ConfigOverrides,
  GroundSite,
  LaunchStage,
  SatelliteFailure,
  Scenario,
  SeriesResult,
  SavedVariant,
} from "../domain";
import { createDefaultOverrides } from "../domain";
import { buildEffectiveScenario } from "../utils/effectiveScenario";
import { generateId } from "../utils/id";
import { scenarioApi } from "../services/scenarioApi";
import type { ValidationError } from "../utils/validation";

interface ScenarioState {
  baseline: Scenario | null;
  overrides: ConfigOverrides;
  effectiveScenario: Scenario | null;
  series: SeriesResult | null;
  computing: boolean;
  computeError: string | null;
  loadErrors: ValidationError[] | null;
  variants: SavedVariant[];
  selectedClientId: string | null;
  selectedSatelliteId: string | null;
  timeIndex: number;

  loadScenario: (scenario: Scenario) => Promise<void>;
  setLoadErrors: (errors: ValidationError[]) => void;
  setLaunchStage: (stage: LaunchStage) => void;
  updatePlane: (planeId: string, patch: { raan_deg?: number; phase_deg?: number }) => void;
  addFailure: (failure: SatelliteFailure) => void;
  removeFailure: (index: number) => void;
  runComputation: () => Promise<void>;
  resetToBaseline: () => Promise<void>;
  saveVariant: (name: string) => void;
  removeVariant: (id: string) => void;
  selectClient: (id: string | null) => void;
  selectSatellite: (id: string | null) => void;
  setTimeIndex: (index: number) => void;
}

function firstClient(scenario: Scenario): GroundSite | undefined {
  return scenario.ground_sites.find((s) => s.role === "client");
}

export const useScenarioStore = create<ScenarioState>()((set, get) => ({
  baseline: null,
  overrides: createDefaultOverrides(1),
  effectiveScenario: null,
  series: null,
  computing: false,
  computeError: null,
  loadErrors: null,
  variants: [],
  selectedClientId: null,
  selectedSatelliteId: null,
  timeIndex: 0,

  loadScenario: async (scenario) => {
    const overrides = createDefaultOverrides(scenario.design.launch_stage);
    set({
      baseline: scenario,
      overrides,
      effectiveScenario: buildEffectiveScenario(scenario, overrides),
      series: null,
      computeError: null,
      loadErrors: null,
      selectedClientId: firstClient(scenario)?.id ?? null,
      selectedSatelliteId: null,
      timeIndex: 0,
    });
    await get().runComputation();
  },

  setLoadErrors: (errors) => set({ loadErrors: errors }),

  setLaunchStage: (stage) => {
    const { baseline, overrides } = get();
    if (!baseline) return;
    const nextOverrides = { ...overrides, launch_stage: stage };
    set({ overrides: nextOverrides, effectiveScenario: buildEffectiveScenario(baseline, nextOverrides) });
  },

  updatePlane: (planeId, patch) => {
    const { baseline, overrides } = get();
    if (!baseline) return;
    const plane = baseline.design.planes.find((p) => p.id === planeId);
    if (!plane) return;
    const current = overrides.plane_overrides[planeId] ?? { raan_deg: plane.raan_deg, phase_deg: plane.phase_deg };
    const nextOverrides: ConfigOverrides = {
      ...overrides,
      plane_overrides: { ...overrides.plane_overrides, [planeId]: { ...current, ...patch } },
    };
    set({ overrides: nextOverrides, effectiveScenario: buildEffectiveScenario(baseline, nextOverrides) });
  },

  addFailure: (failure) => {
    const { baseline, overrides } = get();
    if (!baseline) return;
    const nextOverrides = { ...overrides, added_failures: [...overrides.added_failures, failure] };
    set({ overrides: nextOverrides, effectiveScenario: buildEffectiveScenario(baseline, nextOverrides) });
  },

  removeFailure: (index) => {
    const { baseline, overrides } = get();
    if (!baseline) return;
    const nextOverrides = {
      ...overrides,
      added_failures: overrides.added_failures.filter((_, i) => i !== index),
    };
    set({ overrides: nextOverrides, effectiveScenario: buildEffectiveScenario(baseline, nextOverrides) });
  },

  runComputation: async () => {
    const { effectiveScenario } = get();
    if (!effectiveScenario) return;
    set({ computing: true, computeError: null });
    try {
      const series = await scenarioApi.computeSeries(effectiveScenario);
      const state = get();
      set({
        series,
        computing: false,
        selectedClientId: state.selectedClientId ?? firstClient(effectiveScenario)?.id ?? null,
        timeIndex: Math.min(state.timeIndex, Math.max(0, series.t_grid_s.length - 1)),
      });
    } catch (e) {
      set({ computing: false, computeError: e instanceof Error ? e.message : "Не удалось выполнить расчёт" });
    }
  },

  resetToBaseline: async () => {
    const { baseline } = get();
    if (!baseline) return;
    const overrides = createDefaultOverrides(baseline.design.launch_stage);
    set({ overrides, effectiveScenario: buildEffectiveScenario(baseline, overrides) });
    await get().runComputation();
  },

  saveVariant: (name) => {
    const { effectiveScenario, overrides, series } = get();
    if (!effectiveScenario || !series) return;
    const variant: SavedVariant = {
      id: generateId("variant"),
      name,
      created_at: new Date().toISOString(),
      overrides,
      effective_scenario: effectiveScenario,
      metrics: series.metrics,
    };
    set((s) => ({ variants: [...s.variants, variant] }));
  },

  removeVariant: (id) => set((s) => ({ variants: s.variants.filter((v) => v.id !== id) })),

  selectClient: (id) => set({ selectedClientId: id }),
  selectSatellite: (id) => set({ selectedSatelliteId: id }),
  setTimeIndex: (index) => set({ timeIndex: index }),
}));
