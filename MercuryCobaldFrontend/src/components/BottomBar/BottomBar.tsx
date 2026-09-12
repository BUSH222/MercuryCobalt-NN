import { Chip, IconButton } from "../common/Chip";
import { VIEW_DEFS } from "../Layout/viewRegistry";
import { useUiStore } from "../../store/useUiStore";
import styles from "./BottomBar.module.css";

export function BottomBar() {
  const openPanels = useUiStore((s) => s.openPanels);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);

  return (
    <div className={styles.bar}>
      <div className={styles.chips}>
        {VIEW_DEFS.map((view) => (
          <Chip
            key={view.id}
            icon={view.icon}
            label={view.label}
            active={openPanels.includes(view.id)}
            onClick={() => togglePanel(view.id)}
            title="Показать/скрыть виджет. Несколько выбранных — размещаются рядом и делятся на изменяемые по размеру панели."
          />
        ))}
      </div>
      <div className={styles.actions}>
        <IconButton icon="download" title="Экспорт" onClick={() => setExportOpen(true)} />
        <IconButton icon="settings" title="Настройки" onClick={() => setSettingsOpen(true)} />
      </div>
    </div>
  );
}
