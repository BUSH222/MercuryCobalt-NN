/**
 * UI-only preferences. Per project rules, scenario/computation data never
 * lives here or in localStorage — only interface state that should survive a
 * page reload (sidebar collapse, active view, display toggles) is persisted.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimeDisplayUnit } from "../utils/time";

export type MainView = "map-equirect" | "map-polar" | "stats" | "compare" | "route";

interface UiState {
  sidebarCollapsed: boolean;
  activeView: MainView;
  showAllIsl: boolean;
  timeUnit: TimeDisplayUnit;
  settingsOpen: boolean;
  toggleSidebar: () => void;
  setActiveView: (view: MainView) => void;
  setShowAllIsl: (show: boolean) => void;
  setTimeUnit: (unit: TimeDisplayUnit) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeView: "map-equirect",
      showAllIsl: false,
      timeUnit: "hms",
      settingsOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setActiveView: (view) => set({ activeView: view }),
      setShowAllIsl: (show) => set({ showAllIsl: show }),
      setTimeUnit: (unit) => set({ timeUnit: unit }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
    }),
    {
      name: "cosmohack-ui-settings",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeView: state.activeView,
        showAllIsl: state.showAllIsl,
        timeUnit: state.timeUnit,
      }),
    },
  ),
);
