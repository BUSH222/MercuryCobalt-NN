/**
 * Central application state: the loaded scenario, the user's pending
 * configuration overrides, the last computed series, and saved variants for
 * comparison. Implemented with Redux Toolkit (not Zustand, unlike
 * `useUiStore`/`useOnboardingStore`) specifically so persistence goes through
 * `redux-persist` — see `store.ts` for the `persistReducer` whitelist
 * (`baseline`/`overrides`/`variants`/`selectedClientId`/`timeIndex`) and the
 * rehydration-triggered recompute. `effectiveScenario` and `series` are
 * deliberately excluded from persistence — cheap/heavy to (re)derive
 * respectively, and `series` (per-instant samples for every client across the
 * whole horizon) is far too large to risk the storage quota on.
 *
 * RTK's `createSlice` uses Immer, so reducers below read as plain mutations
 * of `state` even though the store itself stays fully immutable.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ConfigOverrides,
  CoverageCandidate,
  Environment,
  GroundSite,
  LaunchStage,
  SatelliteFailure,
  Scenario,
  SeriesResult,
  SavedVariant,
} from "../domain";
import { createDefaultOverrides, DEFAULT_SIM_DATE } from "../domain";
import { buildEffectiveScenario } from "../utils/effectiveScenario";
import { generateId } from "../utils/id";
import { scenarioApi } from "../services/scenarioApi";
import { useUiStore } from "./useUiStore";
import type { ValidationError } from "../utils/validation";
import type { RootState } from "./store";

export interface ScenarioState {
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
  coverageCandidates: CoverageCandidate[];
  coverageSearching: boolean;
  coverageError: string | null;
}

function firstClient(scenario: Scenario): GroundSite | undefined {
  return scenario.ground_sites.find((s) => s.role === "client");
}

const initialState: ScenarioState = {
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
  coverageCandidates: [],
  coverageSearching: false,
  coverageError: null,
};

// Declared before the slice so `extraReducers` below can reference their
// action creators; `condition` makes each a no-op (no pending/fulfilled
// dispatch at all) when there's nothing to compute against, mirroring the
// old store's early `if (!effectiveScenario) return;` guards.
export const runComputation = createAsyncThunk<SeriesResult, void, { state: RootState }>(
  "scenario/runComputation",
  async (_, { getState }) => {
    const effectiveScenario = getState().scenario.effectiveScenario!;
    const { linkAssumptions, earthModel, routingAlgorithm } = useUiStore.getState();
    return scenarioApi.computeSeries(effectiveScenario, linkAssumptions, earthModel, routingAlgorithm);
  },
  { condition: (_, { getState }) => Boolean(getState().scenario.effectiveScenario) },
);

export const searchCoverage = createAsyncThunk<CoverageCandidate[], void, { state: RootState }>(
  "scenario/searchCoverage",
  async (_, { getState }) => {
    const effectiveScenario = getState().scenario.effectiveScenario!;
    const { earthModel } = useUiStore.getState();
    return scenarioApi.searchCoverage(effectiveScenario, { earthModel });
  },
  { condition: (_, { getState }) => Boolean(getState().scenario.effectiveScenario) },
);

const scenarioSlice = createSlice({
  name: "scenario",
  initialState,
  reducers: {
    scenarioLoaded(state, action: PayloadAction<Scenario>) {
      const scenario = action.payload;
      const overrides = createDefaultOverrides(scenario.design.launch_stage);
      state.baseline = scenario;
      state.overrides = overrides;
      state.effectiveScenario = buildEffectiveScenario(scenario, overrides);
      state.series = null;
      state.computeError = null;
      state.loadErrors = null;
      state.selectedClientId = firstClient(scenario)?.id ?? null;
      state.selectedSatelliteId = null;
      state.timeIndex = 0;
    },
    setLoadErrors(state, action: PayloadAction<ValidationError[]>) {
      state.loadErrors = action.payload;
    },
    setLaunchStage(state, action: PayloadAction<LaunchStage>) {
      if (!state.baseline) return;
      state.overrides.launch_stage = action.payload;
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    updatePlane(state, action: PayloadAction<{ planeId: string; patch: { raan_deg?: number; phase_deg?: number } }>) {
      if (!state.baseline) return;
      const { planeId, patch } = action.payload;
      const plane = state.baseline.design.planes.find((p) => p.id === planeId);
      if (!plane) return;
      const current = state.overrides.plane_overrides[planeId] ?? { raan_deg: plane.raan_deg, phase_deg: plane.phase_deg };
      state.overrides.plane_overrides[planeId] = { ...current, ...patch };
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    addFailure(state, action: PayloadAction<SatelliteFailure>) {
      if (!state.baseline) return;
      state.overrides.added_failures.push(action.payload);
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    removeFailure(state, action: PayloadAction<number>) {
      if (!state.baseline) return;
      state.overrides.added_failures.splice(action.payload, 1);
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    /**
     * Replaces every previously auto-generated (shadow) failure with a fresh
     * batch in one step — re-running the shadow search (e.g. after changing
     * the simulation date) must not accumulate duplicates from earlier runs.
     * Manually added failures are untouched.
     */
    addAutoShadowFailures(state, action: PayloadAction<SatelliteFailure[]>) {
      if (!state.baseline) return;
      state.overrides.added_failures = [
        ...state.overrides.added_failures.filter((f) => !f.autoGenerated),
        ...action.payload,
      ];
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    clearAutoShadowFailures(state) {
      if (!state.baseline) return;
      state.overrides.added_failures = state.overrides.added_failures.filter((f) => !f.autoGenerated);
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    updateEnvironment(state, action: PayloadAction<Environment>) {
      if (!state.baseline) return;
      state.overrides.environment_overrides = action.payload;
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    setSimDate(state, action: PayloadAction<string>) {
      state.overrides.sim_date = action.payload;
    },
    resetToBaselineSync(state) {
      if (!state.baseline) return;
      state.overrides = createDefaultOverrides(state.baseline.design.launch_stage);
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    saveVariant(state, action: PayloadAction<{ name: string }>) {
      if (!state.series || !state.effectiveScenario || !state.baseline) return;
      state.variants.push({
        id: generateId("variant"),
        name: action.payload.name,
        created_at: new Date().toISOString(),
        overrides: state.overrides,
        effective_scenario: state.effectiveScenario,
        baseline: state.baseline,
        metrics: state.series.metrics,
      });
    },
    removeVariant(state, action: PayloadAction<string>) {
      state.variants = state.variants.filter((v) => v.id !== action.payload);
    },
    selectClient(state, action: PayloadAction<string | null>) {
      state.selectedClientId = action.payload;
    },
    selectSatellite(state, action: PayloadAction<string | null>) {
      state.selectedSatelliteId = action.payload;
    },
    setTimeIndex(state, action: PayloadAction<number>) {
      state.timeIndex = action.payload;
    },
    applyCoverageCandidate(state, action: PayloadAction<CoverageCandidate>) {
      if (!state.baseline) return;
      for (const plane of action.payload.planes) {
        state.overrides.plane_overrides[plane.plane_id] = { raan_deg: plane.raan_deg, phase_deg: plane.phase_deg };
      }
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
    resetAll() {
      return initialState;
    },
    /**
     * Rebuilds the derived `effectiveScenario` after a reload restores
     * baseline/overrides from storage, and backfills fields persisted by an
     * older version of the app that predates them: `sim_date` on the current
     * `overrides`, and `baseline` on each saved variant. Before "Загрузить
     * другой сценарий" existed, a variant could only ever have been saved
     * from whatever scenario is currently loaded, so the current `baseline`
     * is the *correct* value here, not just a placeholder.
     */
    rebuildAfterRehydrate(state) {
      if (!state.baseline) return;
      if (!state.overrides.sim_date) state.overrides.sim_date = DEFAULT_SIM_DATE;
      for (const variant of state.variants) {
        if (!variant.baseline) variant.baseline = state.baseline;
      }
      state.effectiveScenario = buildEffectiveScenario(state.baseline, state.overrides);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runComputation.pending, (state) => {
        state.computing = true;
        state.computeError = null;
      })
      .addCase(runComputation.fulfilled, (state, action) => {
        state.series = action.payload;
        state.computing = false;
        if (!state.selectedClientId && state.effectiveScenario) {
          state.selectedClientId = firstClient(state.effectiveScenario)?.id ?? null;
        }
        state.timeIndex = Math.min(state.timeIndex, Math.max(0, action.payload.t_grid_s.length - 1));
      })
      .addCase(runComputation.rejected, (state, action) => {
        state.computing = false;
        state.computeError = action.error.message ?? "Не удалось выполнить расчёт";
      })
      .addCase(searchCoverage.pending, (state) => {
        state.coverageSearching = true;
        state.coverageError = null;
      })
      .addCase(searchCoverage.fulfilled, (state, action) => {
        state.coverageCandidates = action.payload;
        state.coverageSearching = false;
      })
      .addCase(searchCoverage.rejected, (state, action) => {
        state.coverageSearching = false;
        state.coverageError = action.error.message ?? "Не удалось выполнить поиск";
      });
  },
});

export const loadScenario = createAsyncThunk<void, Scenario, { state: RootState }>(
  "scenario/loadScenario",
  async (scenario, { dispatch }) => {
    dispatch(scenarioSlice.actions.scenarioLoaded(scenario));
    await dispatch(runComputation());
  },
);

export const resetToBaseline = createAsyncThunk<void, void, { state: RootState }>(
  "scenario/resetToBaseline",
  async (_, { dispatch }) => {
    dispatch(scenarioSlice.actions.resetToBaselineSync());
    await dispatch(runComputation());
  },
);

export const {
  setLoadErrors,
  setLaunchStage,
  updatePlane,
  addFailure,
  removeFailure,
  addAutoShadowFailures,
  clearAutoShadowFailures,
  updateEnvironment,
  setSimDate,
  saveVariant,
  removeVariant,
  selectClient,
  selectSatellite,
  setTimeIndex,
  applyCoverageCandidate,
  resetAll,
  rebuildAfterRehydrate,
} = scenarioSlice.actions;

export default scenarioSlice.reducer;
