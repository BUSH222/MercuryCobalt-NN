import { useMemo } from "react";
import { geoGraticule10, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, LineString } from "geojson";
import type { GroundSite, IslEdge, SatelliteState } from "../../domain";
import { LAND_FEATURES, NORTHERN_PARALLELS_DEG, parallelCircle } from "../../utils/mapProjections";
import styles from "./MapCanvas.module.css";

export interface MapClickTarget {
  id: string;
  kind: "satellite" | "ground";
}

interface MapCanvasProps {
  width: number;
  height: number;
  projection: GeoProjection;
  satellites: SatelliteState[];
  groundSites: GroundSite[];
  edges: IslEdge[];
  routeEdgePairs: [string, string][];
  routeNodeIds: Set<string>;
  showAllIsl: boolean;
  showParallels?: boolean;
  selectedNodeId: string | null;
  onSelectNode: (target: MapClickTarget) => void;
}

function lineFeature(a: [number, number], b: [number, number]): Feature<LineString> {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [a, b] } };
}

export function MapCanvas({
  width,
  height,
  projection,
  satellites,
  groundSites,
  edges,
  routeEdgePairs,
  routeNodeIds,
  showAllIsl,
  showParallels,
  selectedNodeId,
  onSelectNode,
}: MapCanvasProps) {
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const satelliteById = useMemo(() => new Map(satellites.map((s) => [s.id, s])), [satellites]);
  const groundById = useMemo(() => new Map(groundSites.map((g) => [g.id, g])), [groundSites]);

  const lonLatOf = (id: string): [number, number] | null => {
    const sat = satelliteById.get(id);
    if (sat) return [sat.lon_deg, sat.lat_deg];
    const ground = groundById.get(id);
    if (ground) return [ground.lon_deg, ground.lat_deg];
    return null;
  };

  const graticuleD = useMemo(() => pathGen(geoGraticule10()) ?? undefined, [pathGen]);
  const landD = useMemo(() => pathGen(LAND_FEATURES) ?? undefined, [pathGen]);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Карта группировки">
      <path className={styles.land} d={landD} />
      <path className={styles.graticule} d={graticuleD} />

      {showParallels &&
        NORTHERN_PARALLELS_DEG.map((lat) => {
          const feature = parallelCircle(lat);
          const d = pathGen(feature) ?? undefined;
          const labelPos = projection([2, lat]);
          return (
            <g key={lat}>
              <path className={styles.parallel} d={d} />
              {labelPos && (
                <text className={styles.parallelLabel} x={labelPos[0] + 4} y={labelPos[1]}>
                  {lat}°N
                </text>
              )}
            </g>
          );
        })}

      {showAllIsl &&
        edges.map(([a, b]) => {
          const posA = lonLatOf(a);
          const posB = lonLatOf(b);
          if (!posA || !posB) return null;
          const d = pathGen(lineFeature(posA, posB));
          if (!d) return null;
          return <path key={`${a}-${b}`} className={styles.islEdge} d={d} />;
        })}

      {routeEdgePairs.map(([a, b], idx) => {
        const posA = lonLatOf(a);
        const posB = lonLatOf(b);
        if (!posA || !posB) return null;
        const d = pathGen(lineFeature(posA, posB));
        if (!d) return null;
        return <path key={`route-${idx}-${a}-${b}`} className={styles.routeEdge} d={d} />;
      })}

      {satellites.map((sat) => {
        const pos = projection([sat.lon_deg, sat.lat_deg]);
        if (!pos) return null;
        const onRoute = routeNodeIds.has(sat.id);
        return (
          <g key={sat.id} onClick={() => onSelectNode({ id: sat.id, kind: "satellite" })}>
            <circle
              cx={pos[0]}
              cy={pos[1]}
              r={onRoute ? 4 : 2.6}
              className={`${styles.satellite} ${!sat.active ? styles.satelliteInactive : ""} ${onRoute ? styles.satelliteOnRoute : ""}`}
            />
            {selectedNodeId === sat.id && <circle cx={pos[0]} cy={pos[1]} r={7} className={styles.selectedRing} />}
            <title>{`${sat.id} — ${sat.active ? "активен" : "неактивен"}`}</title>
          </g>
        );
      })}

      {groundSites.map((site) => {
        const pos = projection([site.lon_deg, site.lat_deg]);
        if (!pos) return null;
        const onRoute = routeNodeIds.has(site.id);
        const color = site.role === "gateway" ? "#ff9f45" : "#4fd1c5";
        return (
          <g key={site.id} onClick={() => onSelectNode({ id: site.id, kind: "ground" })} className={styles.groundSite}>
            <circle cx={pos[0]} cy={pos[1]} r={onRoute ? 6 : 4.5} fill={color} stroke="#0a0e14" strokeWidth={1.2} />
            {site.role === "gateway" && (
              <circle cx={pos[0]} cy={pos[1]} r={9} className={styles.groundSiteRing} stroke={color} />
            )}
            {selectedNodeId === site.id && <circle cx={pos[0]} cy={pos[1]} r={11} className={styles.selectedRing} />}
            <text className={styles.groundLabel} x={pos[0] + 8} y={pos[1] + 3}>
              {site.name}
            </text>
            <title>{`${site.name} (${site.role === "gateway" ? "шлюз" : "клиент"})`}</title>
          </g>
        );
      })}
    </svg>
  );
}
