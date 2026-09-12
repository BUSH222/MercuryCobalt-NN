/**
 * Turns the Sun model's day/night test into something `geoPath` can draw.
 * Deliberately NOT an analytic terminator curve clipped to the map bounds —
 * in the equirectangular projection that curve tears at the ±180° seam,
 * which would mean separate antimeridian-splitting logic per projection for
 * no real payoff at map scale. Instead this samples a coarse lat/lon grid and
 * emits one small quad per night-side cell as a single MultiPolygon; both
 * projections just feed it through their own `geoPath` like the land and
 * graticule layers, no per-projection code needed.
 */
import type { Feature, MultiPolygon, Position } from "geojson";
import type { Vec3 } from "./geometry";
import { isNight } from "./sun";

const DEFAULT_STEP_DEG = 8;

/**
 * d3-geo/GeoJSON spherical rings wind clockwise-as-plotted in lon/lat
 * (right-hand rule on the sphere, opposite of flat-plane CCW intuition) —
 * lon-lo/lat-lo, up to lat-hi, across to lon-hi, back down. Getting this
 * backwards doesn't just mirror the quad, it flips it inside-out: d3-geo
 * then renders "the whole sphere except this quad" instead of the quad
 * itself, which at a few hundred quads looks like one solid fill.
 */
function cellRing(lonC: number, latC: number, halfStep: number): Position[] {
  const lonLo = lonC - halfStep;
  const lonHi = lonC + halfStep;
  const latLo = Math.max(-90, latC - halfStep);
  const latHi = Math.min(90, latC + halfStep);
  return [
    [lonLo, latLo],
    [lonLo, latHi],
    [lonHi, latHi],
    [lonHi, latLo],
    [lonLo, latLo],
  ];
}

/** Night-side shading for time t_s, given the Sun's Earth-fixed direction at that same instant. */
export function buildNightFeature(sunEcef: Vec3, stepDeg: number = DEFAULT_STEP_DEG): Feature<MultiPolygon> {
  const half = stepDeg / 2;
  const coordinates: Position[][][] = [];
  for (let latC = -90 + half; latC < 90; latC += stepDeg) {
    for (let lonC = -180 + half; lonC < 180; lonC += stepDeg) {
      if (isNight(sunEcef, latC, lonC)) {
        coordinates.push([cellRing(lonC, latC, half)]);
      }
    }
  }
  return { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates } };
}
