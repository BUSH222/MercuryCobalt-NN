/**
 * Builds a purely computational Three.js heightfield mesh from a fetched
 * terrain grid and raycasts it to derive a `HorizonProfile` — the silhouette
 * of the surrounding terrain as seen from one ground site. Never rendered:
 * no materials/lighting choices matter beyond making `Raycaster` work
 * correctly against arbitrary triangle winding (`DoubleSide`).
 *
 * Local frame: a flat East/North/Up tangent plane in meters, centered on the
 * station (station itself at local (0, 0, 0), before the small observer-
 * height lift below) — X = East, Y = North, Z = Up. This is deliberately not
 * a full 3D ECEF/WGS84 transform: at the ~30km bbox radius these profiles
 * cover, Earth's curvature distorts a flat tangent-plane approximation by at
 * most a few meters, which is irrelevant for a "coarse... believable horizon
 * mask" (this is exactly the kind of shortcut the feature asked to keep
 * simple — a flat local plane, not a full ellipsoidal heightfield).
 */
import * as THREE from "three";
import type { HorizonProfile, TerrainGrid } from "./types";

const METERS_PER_DEG_LAT = 111_320;

const AZIMUTH_STEP_DEG = 5;
const ELEVATION_MIN_DEG = -10;
const ELEVATION_MAX_DEG = 80;
const ELEVATION_STEP_DEG = 1;
/** Nominal height (m) of the observation point above the terrain surface — avoids the ray's origin sitting exactly on the mesh it's testing against. */
const OBSERVER_HEIGHT_M = 2;

/**
 * Elevation directly under the station, interpolated the same way the raycast
 * mesh itself is triangulated below (`indices.push(v00, v10, v01, v01, v10,
 * v11)` — a fixed v01–v10 diagonal, not a smooth bilinear blend of all four
 * corners). This has to match exactly: `stationElevationM` is subtracted from
 * every vertex to place the station at local Z ≈ 0, and the observer origin
 * is offset from *that* by a fixed `OBSERVER_HEIGHT_M`. A true bilinear
 * estimate agrees with this only when the four corners are coplanar: on real
 * terrain with any local ridge/saddle (the `(e00+e11) - (e01+e10)` twist
 * term), the two surfaces disagree right under the station. On mountainous
 * ground that mismatch routinely exceeds `OBSERVER_HEIGHT_M`, which plants
 * the ray origin *inside* the mesh's own home triangle — every cast ray,
 * including near-zenith ones, immediately self-intersects that triangle, so
 * `computeHorizonProfile` reports the station as walled in on all sides
 * (observed: every azimuth blocked up to `ELEVATION_MAX_DEG`, i.e. only
 * satellites passing almost exactly overhead ever clear the "horizon").
 * Using the mesh's own triangle plane instead guarantees the origin sits
 * exactly `OBSERVER_HEIGHT_M` above the ground right beneath it, regardless
 * of local curvature.
 */
function meshElevationM(grid: TerrainGrid, latDeg: number, lonDeg: number): number {
  const { bounds, rows, cols, elevations_m } = grid;
  // rows/cols are always >= 2 (see MIN_GRID_SIZE in terrain_api/terrain.py), so rows-2/cols-2 are safe clamp bounds.
  const rowF = ((bounds.north_deg - latDeg) / (bounds.north_deg - bounds.south_deg)) * (rows - 1);
  const colF = ((lonDeg - bounds.west_deg) / (bounds.east_deg - bounds.west_deg)) * (cols - 1);
  const row0 = Math.min(Math.max(Math.floor(rowF), 0), rows - 2);
  const col0 = Math.min(Math.max(Math.floor(colF), 0), cols - 2);
  const row1 = Math.min(row0 + 1, rows - 1);
  const col1 = Math.min(col0 + 1, cols - 1);
  const fr = Math.min(Math.max(rowF - row0, 0), 1);
  const fc = Math.min(Math.max(colF - col0, 0), 1);
  const e00 = elevations_m[row0]![col0]!;
  const e01 = elevations_m[row0]![col1]!;
  const e10 = elevations_m[row1]![col0]!;
  const e11 = elevations_m[row1]![col1]!;
  if (fr + fc <= 1) {
    // Triangle (v00, v10, v01).
    return e00 + fr * (e10 - e00) + fc * (e01 - e00);
  }
  // Triangle (v01, v10, v11).
  const fr2 = 1 - fr;
  const fc2 = 1 - fc;
  return e11 + fr2 * (e01 - e11) + fc2 * (e10 - e11);
}

function buildTerrainMesh(grid: TerrainGrid): { mesh: THREE.Mesh; stationElevationM: number } {
  const { bounds, rows, cols, elevations_m, lat_deg, lon_deg } = grid;
  const stationElevationM = meshElevationM(grid, lat_deg, lon_deg);
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((lat_deg * Math.PI) / 180);

  const positions = new Float32Array(rows * cols * 3);
  for (let i = 0; i < rows; i++) {
    const rowLat = bounds.north_deg - (i / (rows - 1)) * (bounds.north_deg - bounds.south_deg);
    for (let j = 0; j < cols; j++) {
      const colLon = bounds.west_deg + (j / (cols - 1)) * (bounds.east_deg - bounds.west_deg);
      const idx = (i * cols + j) * 3;
      positions[idx] = (colLon - lon_deg) * metersPerDegLon; // East
      positions[idx + 1] = (rowLat - lat_deg) * METERS_PER_DEG_LAT; // North
      positions[idx + 2] = elevations_m[i]![j]! - stationElevationM; // Up, relative to the station
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const v00 = i * cols + j;
      const v01 = v00 + 1;
      const v10 = v00 + cols;
      const v11 = v10 + 1;
      indices.push(v00, v10, v01, v01, v10, v11);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  // Never rendered — DoubleSide only so raycasting doesn't depend on getting triangle winding exactly right.
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  return { mesh: new THREE.Mesh(geometry, material), stationElevationM };
}

/** Builds the local heightfield mesh once and raycasts it at coarse azimuth/elevation samples to derive the station's horizon silhouette. */
export function computeHorizonProfile(siteId: string, grid: TerrainGrid): HorizonProfile {
  const { mesh } = buildTerrainMesh(grid);
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0.1;
  const origin = new THREE.Vector3(0, 0, OBSERVER_HEIGHT_M);
  const direction = new THREE.Vector3();

  const sampleCount = Math.round(360 / AZIMUTH_STEP_DEG);
  const blockingElevationDeg: number[] = new Array(sampleCount);

  for (let s = 0; s < sampleCount; s++) {
    const azRad = (s * AZIMUTH_STEP_DEG * Math.PI) / 180;
    const sinAz = Math.sin(azRad);
    const cosAz = Math.cos(azRad);
    let blocking = ELEVATION_MIN_DEG;
    for (let elevDeg = ELEVATION_MAX_DEG; elevDeg >= ELEVATION_MIN_DEG; elevDeg -= ELEVATION_STEP_DEG) {
      const elevRad = (elevDeg * Math.PI) / 180;
      const cosElev = Math.cos(elevRad);
      direction.set(cosElev * sinAz, cosElev * cosAz, Math.sin(elevRad));
      raycaster.set(origin, direction);
      const hits = raycaster.intersectObject(mesh, false);
      if (hits.length > 0) {
        blocking = elevDeg;
        break;
      }
    }
    blockingElevationDeg[s] = blocking;
  }

  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();

  return { siteId, azimuthStepDeg: AZIMUTH_STEP_DEG, blockingElevationDeg };
}
