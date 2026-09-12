import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { useAppSelector } from "../../store/hooks";
import { TOUR_STEPS } from "./tourSteps";
import styles from "./OnboardingTour.module.css";

const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT_ESTIMATE = 190;
const GAP = 14;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(targetId: string): Rect | null {
  const el = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!el) return null;
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Guided tour scoped strictly to four Sidebar configuration sections — no
 * other part of the app (not the bottom bar, not the map) ever gets a
 * spotlight/tooltip. Runs once ever: see `useOnboardingStore` for the
 * persisted `hasSeenTour` flag this reads and sets, and `App.tsx` for the
 * auto-start-on-first-visit trigger. If a step's target section doesn't
 * exist yet (no scenario loaded, so the Sidebar shows the empty upload state
 * instead of these sections), the tour simply renders nothing until one
 * does — it never points at the empty state.
 */
export function OnboardingTour() {
  const activeStepIndex = useOnboardingStore((s) => s.activeStepIndex);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const skipTour = useOnboardingStore((s) => s.skipTour);
  const [rect, setRect] = useState<Rect | null>(null);
  // The four target sections only exist once a scenario is loaded (before
  // that the Sidebar shows the empty upload state instead) — re-measure
  // whenever that flips, not just when the step index changes, or the tour
  // would stay invisible forever if it started before any scenario existed.
  const hasScenario = useAppSelector((s) => Boolean(s.scenario.effectiveScenario));

  const step = activeStepIndex !== null ? TOUR_STEPS[activeStepIndex] : undefined;

  useEffect(() => {
    const update = (): void => setRect(step ? measure(step.targetId) : null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [step, hasScenario]);

  if (!step || !rect) return null;

  const isLastStep = activeStepIndex === TOUR_STEPS.length - 1;
  const tooltipLeft = rect.left + rect.width + GAP;
  const tooltipTop = Math.min(
    Math.max(GAP, rect.top),
    window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - GAP,
  );

  return (
    <div className={styles.overlay}>
      <div
        className={styles.spotlight}
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      <div className={styles.tooltip} style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_WIDTH }}>
        <span className={styles.title}>{step.title}</span>
        <span className={styles.text}>{step.text}</span>
        <div className={styles.footer}>
          <span className={styles.progress}>
            {(activeStepIndex ?? 0) + 1} / {TOUR_STEPS.length}
          </span>
          <div className={styles.buttons}>
            <Button variant="ghost" onClick={skipTour}>
              Не показывать больше
            </Button>
            <Button variant="primary" onClick={() => nextStep(TOUR_STEPS.length)}>
              {isLastStep ? "Готово" : "Далее"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
