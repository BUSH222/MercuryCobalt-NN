/**
 * Geo-projection setup shared by both map views. `MapCanvas` renders the same
 * SVG pipeline (land, graticule, satellites, links, routes) regardless of
 * view; only the `GeoProjection` instance passed to it differs between the
 * equirectangular and polar views, per the "один рендер-пайплайн" requirement.
 */
import { geoAzimuthalEquidistant, geoCircle, geoEquirectangular, type GeoProjection, type GeoSphere } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import landTopology from "world-atlas/land-110m.json";

const topology = landTopology as unknown as Topology;

export const LAND_FEATURES: FeatureCollection = feature(
  topology,
  topology.objects.land as GeometryCollection,
) as unknown as FeatureCollection;

export const SPHERE_OUTLINE: GeoSphere = { type: "Sphere" };

export const NORTHERN_PARALLELS_DEG = [60, 70, 80] as const;

export function parallelCircle(latDeg: number): Feature<Geometry> {
  return {
    type: "Feature",
    properties: { lat_deg: latDeg },
    geometry: geoCircle().center([0, 90]).radius(90 - latDeg)(),
  };
}

export function createEquirectangularProjection(width: number, height: number): GeoProjection {
  return geoEquirectangular().fitSize([width, height], SPHERE_OUTLINE);
}

/**
 * Azimuthal equidistant projection centred on the North Pole, clipped a few
 * degrees south of `minLatDeg` so the disk covers every northern ground site
 * with a small margin.
 */
export function createPolarProjection(width: number, height: number, minLatDeg: number): GeoProjection {
  const marginDeg = 5;
  const clipAngle = Math.min(170, 90 - minLatDeg + marginDeg);
  const projection = geoAzimuthalEquidistant().rotate([0, -90, 0]).clipAngle(clipAngle);
  projection.fitSize([width, height], SPHERE_OUTLINE);
  return projection;
}
