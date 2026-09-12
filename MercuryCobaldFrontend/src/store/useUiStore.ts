/**
 * UI-only preferences. Per project rules, scenario/computation data never
 * lives here or in localStorage — only interface state that should survive a
 * page reload (sidebar collapse, open panels, display toggles) is persisted.
 * Panel resize weights are intentionally excluded from persistence: they are
 * a session-scoped convenience, not a setting worth restoring across reloads.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimeDisplayUnit } from "../utils/time";
import { DEFAULT_LINK_ASSUMPTIONS, DEFAULT_ROUTING_ALGORITHM_ID, type LinkAssumptions, type RoutingAlgorithmId } from "../domain";

export type MainView = "map-equirect" | "map-polar" | "map-3d" | "stats" | "compare" | "route";

interface UiState {
  sidebarCollapsed: boolean;
  /** Views currently shown as panels in the main area. Multiple = split layout. */
  openPanels: MainView[];
  /** Resize weight per panel id (flex-grow), shared across whichever row it appears in. */
  panelSizes: Record<string, number>;
  showAllIsl: boolean;
  timeUnit: TimeDisplayUnit;
  settingsOpen: boolean;
  exportOpen: boolean;
  /** Display-tunable physics assumptions (frequency, per-hop delay, status thresholds); not part of the scenario schema. */
  linkAssumptions: LinkAssumptions;
  /** Selected pathfinding strategy (see `utils/routing/`) — a UI setting, not scenario data. */
  routingAlgorithm: RoutingAlgorithmId;
  toggleSidebar: () => void;
  /** Opens/closes a panel; refuses to close the last remaining open panel. */
  togglePanel: (view: MainView) => void;
  setPanelSizes: (sizes: Record<string, number>) => void;
  setShowAllIsl: (show: boolean) => void;
  setTimeUnit: (unit: TimeDisplayUnit) => void;
  setSettingsOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setLinkAssumptions: (patch: Partial<LinkAssumptions>) => void;
  setRoutingAlgorithm: (id: RoutingAlgorithmId) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      openPanels: ["map-equirect"],
      panelSizes: {},
      showAllIsl: false,
      timeUnit: "hms",
      settingsOpen: false,
      exportOpen: false,
      linkAssumptions: DEFAULT_LINK_ASSUMPTIONS,
      routingAlgorithm: DEFAULT_ROUTING_ALGORITHM_ID,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      togglePanel: (view) =>
        set((s) => {
          const isOpen = s.openPanels.includes(view);
          if (isOpen) {
            if (s.openPanels.length === 1) return s;
            return { openPanels: s.openPanels.filter((v) => v !== view) };
          }
          return { openPanels: [...s.openPanels, view] };
        }),
      setPanelSizes: (sizes) => set((s) => ({ panelSizes: { ...s.panelSizes, ...sizes } })),
      setShowAllIsl: (show) => set({ showAllIsl: show }),
      setTimeUnit: (unit) => set({ timeUnit: unit }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setExportOpen: (open) => set({ exportOpen: open }),
      setLinkAssumptions: (patch) => set((s) => ({ linkAssumptions: { ...s.linkAssumptions, ...patch } })),
      setRoutingAlgorithm: (id) => set({ routingAlgorithm: id }),
    }),
    {
      name: "cosmohack-ui-settings",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        openPanels: state.openPanels,
        showAllIsl: state.showAllIsl,
        timeUnit: state.timeUnit,
        linkAssumptions: state.linkAssumptions,
        routingAlgorithm: state.routingAlgorithm,
      }),
    },
  ),
);
