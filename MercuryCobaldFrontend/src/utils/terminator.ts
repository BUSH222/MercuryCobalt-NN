/**
 * Turns the Sun model's day/night split into something `geoPath` can draw:
 * the night hemisphere is exactly the spherical cap of angular radius 90°
 * centred on the antisolar point, so `geoCircle` produces it directly as one
 * well-wound polygon. An earlier version approximated it instead with a
 * coarse lat/lon grid of ~8000 individual quad cells; that rendered fine
 * under the equirectangular projection's antimeridian clipping, but under
 * the polar view's `clipAngle` circle-clipping the many disjoint tiny rings
 * broke d3-geo's clip-and-stitch logic — the projected "night" area came out
 * at roughly 27x the visible disk's own area instead of a plausible
 * fraction of it, i.e. badly garbled fill, not just a jagged edge. A single
 * `geoCircle` polygon is the standard technique for a day/night terminator
 * and is exactly the kind of spherical shape both clip strategies are built
 * to handle correctly.
 */
import { geoCircle } from "d3-geo";
import type { Feature, Polygon } from "geojson";
import type { Vec3 } from "./geometry";

function lonLatOfUnitVector(v: Vec3): [number, number] {
  const lonDeg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  const latDeg = (Math.asin(Math.max(-1, Math.min(1, v.z))) * 180) / Math.PI;
  return [lonDeg, latDeg];
}

/** Night-side shading for the instant `sunEcef` (the Sun's Earth-fixed direction) represents. */
export function buildNightFeature(sunEcef: Vec3): Feature<Polygon> {
  const [subsolarLon, subsolarLat] = lonLatOfUnitVector(sunEcef);
  const antisolarLon = subsolarLon > 0 ? subsolarLon - 180 : subsolarLon + 180;
  const antisolarLat = -subsolarLat;
  return {
    type: "Feature",
    properties: {},
    geometry: geoCircle().center([antisolarLon, antisolarLat]).radius(90)(),
  };
}
