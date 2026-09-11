import { Sidebar } from "./components/Sidebar/Sidebar";
import { BottomBar } from "./components/BottomBar/BottomBar";
import { EquirectangularMap } from "./components/MapView/EquirectangularMap";
import { PolarMap } from "./components/MapView/PolarMap";
import { RouteDetails } from "./components/RouteDetails/RouteDetails";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { StatsView } from "./features/availability-timeline/StatsView";
import { VariantComparison } from "./features/variant-comparison/VariantComparison";
import { useUiStore } from "./store/useUiStore";
import styles from "./App.module.css";

function App() {
  const activeView = useUiStore((s) => s.activeView);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <div className={styles.content}>
          {activeView === "map-equirect" && <EquirectangularMap />}
          {activeView === "map-polar" && <PolarMap />}
          {activeView === "stats" && <StatsView />}
          {activeView === "compare" && <VariantComparison />}
          {activeView === "route" && <RouteDetails />}
        </div>
        <BottomBar />
      </div>
      <SettingsPanel />
    </div>
  );
}

export default App;
