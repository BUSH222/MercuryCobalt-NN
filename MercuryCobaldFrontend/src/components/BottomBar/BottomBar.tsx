import { Chip, IconButton } from "../common/Chip";
import type { IconName } from "../common/Icon";
import { useUiStore, type MainView } from "../../store/useUiStore";
import styles from "./BottomBar.module.css";

const VIEWS: { id: MainView; label: string; icon: IconName }[] = [
  { id: "map-equirect", label: "Карта (прямоугольная)", icon: "globe" },
  { id: "map-polar", label: "Карта (полярная)", icon: "compass" },
  { id: "stats", label: "Статистика", icon: "chart" },
  { id: "compare", label: "Сравнение", icon: "compare" },
  { id: "route", label: "Маршрут", icon: "route" },
];

export function BottomBar() {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  return (
    <div className={styles.bar}>
      <div className={styles.chips}>
        {VIEWS.map((view) => (
          <Chip
            key={view.id}
            icon={view.icon}
            label={view.label}
            active={activeView === view.id}
            onClick={() => setActiveView(view.id)}
          />
        ))}
      </div>
      <IconButton icon="settings" title="Настройки и экспорт" onClick={() => setSettingsOpen(true)} />
    </div>
  );
}
