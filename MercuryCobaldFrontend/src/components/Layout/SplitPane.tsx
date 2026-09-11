import { Fragment, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import styles from "./SplitPane.module.css";

export interface SplitPaneItem {
  id: string;
  /** Relative weight (flex-grow); panes with equal weight split the space evenly. */
  size: number;
  content: ReactNode;
}

interface SplitPaneProps {
  direction: "row" | "column";
  panes: SplitPaneItem[];
  onResize: (sizes: Record<string, number>) => void;
}

const MIN_WEIGHT_FRACTION = 0.15;

/**
 * Lays out panes along one axis with draggable dividers between them. Sizes
 * are relative weights (like flex-grow); dragging a divider shifts weight
 * between its two neighbours only, so unrelated panes never jump.
 */
export function SplitPane({ direction, panes, onResize }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isRow = direction === "row";

  function startDrag(leftId: string, rightId: string) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const containerSize = isRow ? rect.width : rect.height;
      const totalWeight = panes.reduce((sum, p) => sum + p.size, 0);
      const startPos = isRow ? e.clientX : e.clientY;
      const leftPane = panes.find((p) => p.id === leftId);
      const rightPane = panes.find((p) => p.id === rightId);
      if (!leftPane || !rightPane) return;
      const startLeft = leftPane.size;
      const startRight = rightPane.size;
      const pairTotal = startLeft + startRight;
      const minWeight = totalWeight * MIN_WEIGHT_FRACTION;

      const move = (ev: PointerEvent): void => {
        const pos = isRow ? ev.clientX : ev.clientY;
        const deltaWeight = ((pos - startPos) / containerSize) * totalWeight;
        const newLeft = Math.min(pairTotal - minWeight, Math.max(minWeight, startLeft + deltaWeight));
        onResize({ [leftId]: newLeft, [rightId]: pairTotal - newLeft });
      };
      const up = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  return (
    <div ref={containerRef} className={styles.container} style={{ flexDirection: direction }}>
      {panes.map((pane, idx) => (
        <Fragment key={pane.id}>
          <div className={styles.pane} style={{ flexGrow: pane.size, flexBasis: 0 }}>
            {pane.content}
          </div>
          {idx < panes.length - 1 && (
            <div
              className={isRow ? styles.dividerRow : styles.dividerColumn}
              onPointerDown={startDrag(pane.id, panes[idx + 1]!.id)}
              role="separator"
              aria-orientation={isRow ? "vertical" : "horizontal"}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
