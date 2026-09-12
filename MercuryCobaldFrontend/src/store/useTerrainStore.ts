/**
 * Loading/error state for the "Advanced (terrain, WGS84)" earth model's
 * terrain fetch — separate from `useUiStore` and not persisted, because
 * unlike `earthModel` itself (a standing preference) this tracks an
 * in-flight async operation tied to the currently loaded scenario's ground
 * sites, the same reasoning that keeps `series` out of persistence in
 * `scenarioSlice`. The actual fetched/cached profiles live in
 * `terrain/horizonCache.ts`, not here — this store is purely "is it ready
 * yet, and if not, why."
 */
import { create } from "zustand";

export type TerrainSyncStatus = "idle" | "loading" | "ready" | "error";

interface TerrainStoreState {
  status: TerrainSyncStatus;
  error: string | null;
  setLoading: () => void;
  setReady: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useTerrainStore = create<TerrainStoreState>()((set) => ({
  status: "idle",
  error: null,
  setLoading: () => set({ status: "loading", error: null }),
  setReady: () => set({ status: "ready", error: null }),
  setError: (message) => set({ status: "error", error: message }),
  reset: () => set({ status: "idle", error: null }),
}));
