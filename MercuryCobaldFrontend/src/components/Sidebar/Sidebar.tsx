import { Icon } from "../common/Icon";
import { IconButton } from "../common/Chip";
import { Section } from "../common/Section";
import { useUiStore } from "../../store/useUiStore";
import { useScenarioStore } from "../../store/useScenarioStore";
import { ScenarioLoader } from "../../features/scenario-loader/ScenarioLoader";
import { ScenarioSummary } from "../../features/configuration-editor/ScenarioSummary";
import { LaunchStageControl } from "../../features/configuration-editor/LaunchStageControl";
import { PlanesEditor } from "../../features/configuration-editor/PlanesEditor";
import { FailuresEditor } from "../../features/configuration-editor/FailuresEditor";
import { ActionButtons } from "../../features/configuration-editor/ActionButtons";
import { CoverageOptimizer } from "../../features/configuration-editor/CoverageOptimizer";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const effectiveScenario = useScenarioStore((s) => s.effectiveScenario);
  const overrides = useScenarioStore((s) => s.overrides);
  const computing = useScenarioStore((s) => s.computing);
  const variantCount = useScenarioStore((s) => s.variants.length);
  const setLaunchStage = useScenarioStore((s) => s.setLaunchStage);
  const updatePlane = useScenarioStore((s) => s.updatePlane);
  const addFailure = useScenarioStore((s) => s.addFailure);
  const removeFailure = useScenarioStore((s) => s.removeFailure);
  const runComputation = useScenarioStore((s) => s.runComputation);
  const saveVariant = useScenarioStore((s) => s.saveVariant);
  const resetToBaseline = useScenarioStore((s) => s.resetToBaseline);

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
            <Section title="Этап развёртывания">
              <LaunchStageControl
                satellites={effectiveScenario.design.satellites}
                value={effectiveScenario.design.launch_stage}
                onChange={setLaunchStage}
              />
            </Section>
            <Section title="Орбитальные плоскости">
              <PlanesEditor
                planes={effectiveScenario.design.planes}
                satellites={effectiveScenario.design.satellites}
                onChange={updatePlane}
              />
            </Section>
            <Section title="Оптимизация покрытия">
              <CoverageOptimizer />
            </Section>
            <Section title="Отказы спутников">
              <FailuresEditor
                satellites={effectiveScenario.design.satellites}
                environment={effectiveScenario.environment}
                failures={overrides.added_failures}
                onAdd={addFailure}
                onRemove={removeFailure}
              />
            </Section>
            <Section title="Действия">
              <ActionButtons
                computing={computing}
                variantCount={variantCount}
                onRunComputation={() => void runComputation()}
                onSaveVariant={saveVariant}
                onReset={() => void resetToBaseline()}
              />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
