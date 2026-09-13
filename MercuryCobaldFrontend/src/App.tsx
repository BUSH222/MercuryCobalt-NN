import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { BottomBar } from "./components/BottomBar/BottomBar";
import { PanelGrid } from "./components/Layout/PanelGrid";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { ExportPanel } from "./components/SettingsPanel/ExportPanel";
import { OnboardingTour } from "./components/Onboarding/OnboardingTour";
import { useOnboardingStore } from "./store/useOnboardingStore";
import { useAppSelector } from "./store/hooks";
import { useAdvancedTerrainSync } from "./terrain/useAdvancedTerrainSync";
import { useRoutingAlgorithmSync } from "./store/useRoutingAlgorithmSync";
import styles from "./App.module.css";

function App() {
  const hasScenario = useAppSelector((s) => Boolean(s.scenario.effectiveScenario));
  const hasSeenTour = useOnboardingStore((s) => s.hasSeenTour);
  const startTour = useOnboardingStore((s) => s.startTour);

  // Auto-starts once a scenario is first loaded; `startTour` itself is a
  // no-op on any later call, so this doesn't need to guard against re-firing.
  useEffect(() => {
    if (hasScenario && !hasSeenTour) startTour();
  }, [hasScenario, hasSeenTour, startTour]);

  // Mounted here (not inside Settings) so the terrain fetch keeps running for
  // every ground site regardless of which panels are open — see the hook.
  useAdvancedTerrainSync();
  // Same reasoning: changing the routing algorithm must recompute even if
  // Settings gets closed right after — see the hook.
  useRoutingAlgorithmSync();

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <div className={styles.content}>
          <PanelGrid />
        </div>
        <BottomBar />
      </div>
      <SettingsPanel />
      <ExportPanel />
      <OnboardingTour />
    </div>
  );
}

export default App;
