/**
 * Public interface of the terrain/advanced-visibility module. Everything
 * else in this folder is an implementation detail reached only through here.
 */
export { getHorizonProfile, getCachedHorizonProfile } from "./horizonCache";
export { isVisibleAdvanced as isVisible, applyAdvancedVisibility } from "./visibility";
export { TerrainFetchError, fetchTerrainGrid } from "./terrainApi";
export type { HorizonProfile, TerrainGrid, TerrainBounds } from "./types";
