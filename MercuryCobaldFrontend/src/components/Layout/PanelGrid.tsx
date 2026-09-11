import { useMemo, useState } from "react";
import { useUiStore, type MainView } from "../../store/useUiStore";
import { VIEW_DEFS, viewDef } from "./viewRegistry";
import { SplitPane, type SplitPaneItem } from "./SplitPane";
import { PanelCard } from "./PanelCard";
import styles from "./PanelGrid.module.css";

/** At most two rows: everything in one row up to 3 panels, split 2/2 or 3/2 beyond that. */
function chunkIntoRows(ids: MainView[]): MainView[][] {
  if (ids.length <= 3) return [ids];
  const mid = Math.ceil(ids.length / 2);
  return [ids.slice(0, mid), ids.slice(mid)];
}

/**
 * Renders every open panel. A single open panel fills the area exactly as
 * before (no chrome, no dividers) so the default single-view flow is
 * unchanged. Two or more panels are arranged into resizable rows, each panel
 * wrapped in a small header card with a close button mirroring its bottom-bar
 * chip's toggle.
 */
export function PanelGrid() {
  const openPanels = useUiStore((s) => s.openPanels);
  const panelSizes = useUiStore((s) => s.panelSizes);
  const setPanelSizes = useUiStore((s) => s.setPanelSizes);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const [rowSplit, setRowSplit] = useState<Record<string, number>>({ top: 1, bottom: 1 });

  const orderedIds = useMemo(
    () => VIEW_DEFS.map((v) => v.id).filter((id) => openPanels.includes(id)),
    [openPanels],
  );

  if (orderedIds.length <= 1) {
    const id = orderedIds[0] ?? VIEW_DEFS[0]!.id;
    return <div className={styles.fill}>{viewDef(id).render()}</div>;
  }

  const rows = chunkIntoRows(orderedIds);

  const rowPanes = (ids: MainView[]): SplitPaneItem[] =>
    ids.map((id) => {
      const def = viewDef(id);
      return {
        id,
        size: panelSizes[id] ?? 1,
        content: (
          <PanelCard title={def.label} icon={def.icon} onClose={() => togglePanel(id)}>
            {def.render()}
          </PanelCard>
        ),
      };
    });

  if (rows.length === 1) {
    return (
      <div className={styles.fill}>
        <SplitPane direction="row" panes={rowPanes(rows[0]!)} onResize={setPanelSizes} />
      </div>
    );
  }

  const [topRow, bottomRow] = rows;

  return (
    <div className={styles.fill}>
      <SplitPane
        direction="column"
        panes={[
          {
            id: "top",
            size: rowSplit.top ?? 1,
            content: <SplitPane direction="row" panes={rowPanes(topRow!)} onResize={setPanelSizes} />,
          },
          {
            id: "bottom",
            size: rowSplit.bottom ?? 1,
            content: <SplitPane direction="row" panes={rowPanes(bottomRow!)} onResize={setPanelSizes} />,
          },
        ]}
        onResize={(sizes) => setRowSplit((prev) => ({ ...prev, ...sizes }))}
      />
    </div>
  );
}
