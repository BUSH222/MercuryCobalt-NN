/**
 * Triggers the terrain fetch for every ground site (client and gateway —
 * advanced mode covers both) whenever advanced mode is switched on, or a
 * different scenario's ground sites appear while it's already on. Mounted
 * once at the app root (see App.tsx) so it fires regardless of which panels
 * happen to be open — the "loading state" and "clear inline error" this
 * drives live in `useTerrainStore`, read by `SettingsPanel`.
 *
 * Deliberately not run per-timestep or per-render: terrain is static for a
 * scenario's lifetime, so this effect keys off the *set* of ground sites
 * (via a stable string, not the array reference) rather than re-running on
 * every unrelated store update.
 */
import { useEffect } from "react";
import { useAppSelector } from "../store/hooks";
import { useTerrainStore } from "../store/useTerrainStore";
import { useUiStore } from "../store/useUiStore";
import { getHorizonProfile } from "./horizonCache";

export function useAdvancedTerrainSync(): void {
  const earthModel = useUiStore((s) => s.earthModel);
  const groundSites = useAppSelector((s) => s.scenario.effectiveScenario?.ground_sites ?? []);
  const setLoading = useTerrainStore((s) => s.setLoading);
  const setReady = useTerrainStore((s) => s.setReady);
  const setError = useTerrainStore((s) => s.setError);
  const reset = useTerrainStore((s) => s.reset);

  const sitesKey = groundSites.map((s) => `${s.id}:${s.lat_deg.toFixed(4)},${s.lon_deg.toFixed(4)}`).join("|");

  useEffect(() => {
    if (earthModel !== "advanced" || groundSites.length === 0) {
      reset();
      return;
    }
    let cancelled = false;
    setLoading();
    Promise.all(groundSites.map((site) => getHorizonProfile(site)))
      .then(() => {
        if (!cancelled) setReady();
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить рельеф");
      });
    return () => {
      cancelled = true;
    };
    // groundSites is intentionally not listed: sitesKey is its stable, content-based proxy — depending on the array itself would refire on every unrelated scenario recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earthModel, sitesKey]);
}
