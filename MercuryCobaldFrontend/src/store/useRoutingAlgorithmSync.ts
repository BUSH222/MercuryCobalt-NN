/**
 * Immediately re-runs the computation whenever the routing algorithm setting
 * changes, so the currently displayed route — and every figure derived from
 * it (stats, comparison) — reflects the new algorithm right away. This is
 * different from `linkAssumptions`/`earthModel`, which the Settings panel's
 * own hint says only take effect on the next explicit "Запустить расчёт":
 * the whole point of exposing a routing algorithm choice is to let someone
 * compare algorithms interactively, so it can't wait for a manual re-run.
 *
 * Mounted once at the app root (see App.tsx), like `useAdvancedTerrainSync`,
 * so it still fires if the algorithm is changed and Settings is closed right
 * after. Skips the very first run: `scenarioLoaded`/rehydration already
 * trigger their own initial computation, and firing again immediately after
 * mount would just repeat it under the default algorithm for no reason.
 * `runComputation`'s own `condition` already no-ops when nothing is loaded,
 * so no separate guard for that is needed here.
 */
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./hooks";
import { runComputation } from "./scenarioSlice";
import { useUiStore } from "./useUiStore";

export function useRoutingAlgorithmSync(): void {
  const routingAlgorithm = useUiStore((s) => s.routingAlgorithm);
  const dispatch = useAppDispatch();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    void dispatch(runComputation());
  }, [routingAlgorithm, dispatch]);
}
