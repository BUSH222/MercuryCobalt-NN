import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import { groundSiteEcef } from "../../utils/geometry";
import { LAND_FEATURES } from "../../utils/mapProjections";

export const EARTH_KM = 6371;

// ECEF Z is north; Three.js Y is up. This is a rotation, not a reflection.
export function globePosition(x: number, y: number, z: number): Vector3 {
  return new Vector3(x / EARTH_KM, z / EARTH_KM, -y / EARTH_KM);
}

export function sitePosition(lat: number, lon: number): Vector3 {
  const p = groundSiteEcef(lat, lon);
  return globePosition(p.x, p.y, p.z);
}

/** Central angle at the minimum elevation; same spherical model as geometry.ts. */
export function coverageAngle(orbitRadius: number, elevationDeg: number): number {
  const elevation = elevationDeg * Math.PI / 180;
  return Math.max(0, Math.acos(Math.min(1, Math.cos(elevation) / orbitRadius)) - elevation);
}

/** Ring on a sphere around a radial direction, returned as independent segments. */
export function coverageRing(center: Vector3, angle: number, radius: number): number[] {
  const n = center.clone().normalize();
  const tangent = new Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
  const bitangent = new Vector3().crossVectors(n, tangent);
  const points: Vector3[] = [];
  for (let k = 0; k <= 64; k++) {
    const a = k * Math.PI * 2 / 64;
    points.push(n.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle) * Math.cos(a)).addScaledVector(bitangent, Math.sin(angle) * Math.sin(a)).multiplyScalar(radius));
  }
  return points.slice(1).flatMap((p, i) => [...points[i]!.toArray(), ...p.toArray()]);
}

/**
 * Deliberately no night-side shading here (unlike the 2D map): baking it into
 * this texture meant rebuilding and re-uploading a fresh 2048x1024 canvas
 * texture to the GPU on every timeline tick (the Sun's direction changes each
 * tick), which was heavy enough to visibly stutter the globe while scrubbing.
 * The texture below has no time-varying input, so it's now built once.
 */
export function createEarthTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось создать текстуру Земли");
  context.fillStyle = "#0c1421";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const projection = geoEquirectangular().translate([1024, 512]).scale(2048 / (2 * Math.PI));
  const path = geoPath(projection, context);
  context.beginPath();
  path(LAND_FEATURES);
  context.fillStyle = "#1c2b40";
  context.fill();
  context.strokeStyle = "#3a506b";
  context.lineWidth = 1.2;
  context.stroke();
  context.beginPath();
  path(geoGraticule10());
  context.strokeStyle = "#25364c";
  context.lineWidth = 0.65;
  context.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
