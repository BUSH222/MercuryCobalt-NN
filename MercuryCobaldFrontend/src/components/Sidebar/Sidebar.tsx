import { Icon } from "../common/Icon";
import { IconButton } from "../common/Chip";
import { Section } from "../common/Section";
import { useUiStore } from "../../store/useUiStore";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  addFailure,
  removeFailure,
  resetToBaseline,
  runComputation,
  saveVariant,
  setLaunchStage,
  updatePlane,
} from "../../store/scenarioSlice";
import { ScenarioLoader } from "../../features/scenario-loader/ScenarioLoader";
import { ScenarioSummary } from "../../features/configuration-editor/ScenarioSummary";
import { LaunchStageControl } from "../../features/configuration-editor/LaunchStageControl";
import { PlanesEditor } from "../../features/configuration-editor/PlanesEditor";
import { FailuresEditor } from "../../features/configuration-editor/FailuresEditor";
import { ActionButtons } from "../../features/configuration-editor/ActionButtons";
import { CoverageOptimizer } from "../../features/configuration-editor/CoverageOptimizer";
import type { LaunchStage } from "../../domain";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const dispatch = useAppDispatch();
  const effectiveScenario = useAppSelector((s) => s.scenario.effectiveScenario);
  const overrides = useAppSelector((s) => s.scenario.overrides);
  const computing = useAppSelector((s) => s.scenario.computing);
  const variantCount = useAppSelector((s) => s.scenario.variants.length);

  if (collapsed) {
    return (
      <aside className={`${styles.sidebar} ${styles.collapsed}`}>
        <div className={styles.collapsedRail}>
          <IconButton icon="chevron-right" title="Развернуть панель" onClick={toggleSidebar} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.brand}>
          <Icon name="satellite" size={18} />
          Конфигурация группировки
        </span>
        <IconButton icon="chevron-left" title="Свернуть панель" onClick={toggleSidebar} />
      </div>

      <div className={styles.scroll}>
        {!effectiveScenario ? (
          <div className={styles.emptyPad}>
            <ScenarioLoader />
          </div>
        ) : (
          <>
            <Section title="Сценарий">
              <ScenarioSummary scenario={effectiveScenario} />
            </Section>
            <Section title="Этап развёртывания" tourId="tour-launch-stage">
              <LaunchStageControl
                satellites={effectiveScenario.design.satellites}
                value={effectiveScenario.design.launch_stage}
                onChange={(stage: LaunchStage) => dispatch(setLaunchStage(stage))}
              />
            </Section>
            <Section title="Орбитальные плоскости" tourId="tour-planes">
              <PlanesEditor
                planes={effectiveScenario.design.planes}
                satellites={effectiveScenario.design.satellites}
                onChange={(planeId, patch) => dispatch(updatePlane({ planeId, patch }))}
              />
            </Section>
            <Section title="Оптимизация покрытия" tourId="tour-coverage">
              <CoverageOptimizer />
            </Section>
            <Section title="Отказы спутников" tourId="tour-failures">
              <FailuresEditor
                satellites={effectiveScenario.design.satellites}
                environment={effectiveScenario.environment}
                failures={overrides.added_failures}
                onAdd={(failure) => dispatch(addFailure(failure))}
                onRemove={(index) => dispatch(removeFailure(index))}
              />
            </Section>
            <Section title="Действия">
              <ActionButtons
                computing={computing}
                variantCount={variantCount}
                onRunComputation={() => void dispatch(runComputation())}
                onSaveVariant={(name) => dispatch(saveVariant({ name }))}
                onReset={() => void dispatch(resetToBaseline())}
              />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
