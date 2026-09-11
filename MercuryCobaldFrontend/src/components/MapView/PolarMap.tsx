import { useMemo } from "react";
import { useScenarioStore } from "../../store/useScenarioStore";
import { createPolarProjection } from "../../utils/mapProjections";
import { MapViewFrame } from "./MapViewFrame";

const SIZE = 760;
const DEFAULT_MIN_LAT = 55;

export function PolarMap() {
  const groundSites = useScenarioStore((s) => s.effectiveScenario?.ground_sites);

  const minLatDeg = useMemo(() => {
    if (!groundSites || groundSites.length === 0) return DEFAULT_MIN_LAT;
    return Math.min(...groundSites.map((g) => g.lat_deg));
  }, [groundSites]);

  const projection = useMemo(() => createPolarProjection(SIZE, SIZE, minLatDeg), [minLatDeg]);

  return <MapViewFrame width={SIZE} height={SIZE} projection={projection} showParallels />;
}
