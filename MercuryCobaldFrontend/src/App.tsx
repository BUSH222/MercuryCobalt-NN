import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { BottomBar } from "./components/BottomBar/BottomBar";
import { PanelGrid } from "./components/Layout/PanelGrid";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { OnboardingTour } from "./components/Onboarding/OnboardingTour";
import { useOnboardingStore } from "./store/useOnboardingStore";
import { useAppSelector } from "./store/hooks";
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
      <OnboardingTour />
    </div>
  );
}

export default App;
