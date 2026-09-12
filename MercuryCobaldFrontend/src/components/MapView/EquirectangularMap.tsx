import { useMemo } from "react";
import { createEquirectangularProjection } from "../../utils/mapProjections";
import { MapViewFrame } from "./MapViewFrame";

const WIDTH = 1000;
const HEIGHT = 520;

export function EquirectangularMap() {
  const projection = useMemo(() => createEquirectangularProjection(WIDTH, HEIGHT), []);
  return <MapViewFrame width={WIDTH} height={HEIGHT} projection={projection} />;
}
