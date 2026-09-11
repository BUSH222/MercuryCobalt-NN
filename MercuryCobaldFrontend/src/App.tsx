import { Sidebar } from "./components/Sidebar/Sidebar";
import { BottomBar } from "./components/BottomBar/BottomBar";
import { PanelGrid } from "./components/Layout/PanelGrid";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import styles from "./App.module.css";

function App() {
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
    </div>
  );
}

export default App;
