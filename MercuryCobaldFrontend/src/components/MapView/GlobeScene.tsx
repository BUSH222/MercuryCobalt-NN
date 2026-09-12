import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, Color, InstancedMesh, Object3D, Quaternion, SRGBColorSpace, Vector3, type SpriteMaterial } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Scenario, Snapshot } from "../../domain";
import type { MapClickTarget } from "./MapCanvas";
import { coverageAngle, coverageRing, createEarthTexture, EARTH_KM, globePosition, sitePosition } from "./globeGeometry";

interface Props {
  scenario: Scenario;
  snapshot: Snapshot;
  routeEdgePairs: [string, string][];
  routeNodeIds: Set<string>;
  showAllIsl: boolean;
  satelliteCoverage: boolean;
  groundCoverage: boolean;
  selectedNode: MapClickTarget | null;
  onSelect: (target: MapClickTarget) => void;
  resetKey: number;
}

function Controls({ resetKey }: { resetKey: number }) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.09;
    orbit.enablePan = false;
    orbit.minDistance = 1.4;
    orbit.maxDistance = 7;
    const changed = () => invalidate();
    orbit.addEventListener("change", changed);
    controls.current = orbit;
    return () => {
      orbit.removeEventListener("change", changed);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const halfFov = Math.atan(Math.tan(21 * Math.PI / 180) * Math.min(1, size.width / Math.max(1, size.height)));
    const distance = Math.max(3.7, 1.25 / Math.sin(halfFov));
    camera.position.set(1.6, 2.3, -2.3).normalize().multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [camera, invalidate, resetKey, size.width, size.height]);
  useFrame(() => controls.current?.update());
  return null;
}

function Earth() {
  const { gl } = useThree();
  // Effect lifecycle also handles StrictMode's setup/cleanup cycle.
  const material = useRef<import("three").MeshBasicMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const texture = createEarthTexture();
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    if (material.current) {
      material.current.map = texture;
      material.current.needsUpdate = true;
    }
    invalidate();
    return () => texture.dispose();
  }, [gl, invalidate]);
  return (
    <mesh onClick={(e) => e.stopPropagation()}>
      <sphereGeometry args={[1, 96, 64]} />
      <meshBasicMaterial ref={material} />
    </mesh>
  );
}

function Segments({ points, color, opacity = 1 }: { points: Float32Array; color: string; opacity?: number }) {
  if (!points.length) return null;
  return (
    <lineSegments raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

function GroundLabel({ name, position, color }: { name: string; position: Vector3; color: string }) {
  const material = useRef<SpriteMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.font = "24px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = "#0a0e14";
    context.lineWidth = 5;
    context.strokeText(name, 256, 32, 500);
    context.fillStyle = color;
    context.fillText(name, 256, 32, 500);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    if (material.current) { material.current.map = texture; material.current.needsUpdate = true; }
    invalidate();
    return () => texture.dispose();
  }, [name, color, invalidate]);
  return <sprite position={position.clone().multiplyScalar(1.045)} scale={[0.48, 0.06, 1]} raycast={() => {}}>
    <spriteMaterial ref={material} transparent depthWrite={false} />
  </sprite>;
}

function RouteLinks({ points }: { points: Float32Array }) {
  const segments = useMemo(() => {
    const result = [];
    for (let i = 0; i < points.length; i += 6) {
      const start = new Vector3().fromArray(points, i);
      const end = new Vector3().fromArray(points, i + 3);
      const direction = end.clone().sub(start);
      if (direction.lengthSq() === 0) continue;
      result.push({ midpoint: start.add(end).multiplyScalar(0.5), length: direction.length(), rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()) });
    }
    return result;
  }, [points]);
  return segments.map((segment, i) => <mesh key={i} position={segment.midpoint} quaternion={segment.rotation} scale={[1, segment.length, 1]} raycast={() => {}}>
    <cylinderGeometry args={[0.002, 0.002, 1, 6]} />
    <meshBasicMaterial color="#ffb568" />
  </mesh>);
}

export function GlobeScene(props: Props) {
  const { scenario, snapshot, routeNodeIds, selectedNode, onSelect } = props;
  const markerMesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const positions = useMemo(() => {
    const map = new Map<string, Vector3>();
    for (const sat of snapshot.satellites) map.set(sat.id, globePosition(sat.x_km, sat.y_km, sat.z_km));
    for (const site of scenario.ground_sites) map.set(site.id, sitePosition(site.lat_deg, site.lon_deg));
    return map;
  }, [snapshot, scenario.ground_sites]);
  const nodes = useMemo(() => [
    ...snapshot.satellites.map((sat) => ({ id: sat.id, kind: "satellite" as const, color: !sat.active ? "#3c4759" : routeNodeIds.has(sat.id) ? "#ff9f45" : "#6fa8ff", size: 0.009 })),
    ...scenario.ground_sites.map((site) => ({ id: site.id, kind: "ground" as const, color: snapshot.gateway_down[site.id] ? "#ef6b6b" : site.role === "gateway" ? "#ff9f45" : "#4fd1c5", size: site.role === "gateway" ? 0.016 : 0.012 })),
  ], [snapshot, scenario.ground_sites, routeNodeIds]);
  useLayoutEffect(() => {
    const mesh = markerMesh.current;
    if (!mesh) return;
    const dummy = new Object3D();
    nodes.forEach((node, index) => {
      dummy.position.copy(positions.get(node.id)!);
      dummy.scale.setScalar(node.size * (routeNodeIds.has(node.id) ? 1.3 : 1));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new Color(node.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [nodes, positions, routeNodeIds, invalidate]);

  const lines = useMemo(() => {
    const isl: number[] = [], route: number[] = [], footprints: number[] = [];
    const clients: number[] = [], gateways: number[] = [], groundLinks: number[] = [], down: number[] = [];
    const append = (out: number[], a: string, b: string) => {
      const start = positions.get(a), end = positions.get(b);
      if (start && end) out.push(...start.toArray(), ...end.toArray());
    };
    if (props.showAllIsl) for (const [a, b] of snapshot.edges) append(isl, a, b);
    for (const [a, b] of props.routeEdgePairs) append(route, a, b);
    if (props.satelliteCoverage) {
      for (const sat of snapshot.satellites) {
        if (!sat.active) continue;
        const p = positions.get(sat.id)!;
        footprints.push(...coverageRing(p, coverageAngle(p.length(), scenario.environment.min_elevation_deg), 1.002));
      }
    }
    if (props.groundCoverage) {
      const radius = 1 + scenario.environment.altitude_km / EARTH_KM;
      const angle = coverageAngle(radius, scenario.environment.min_elevation_deg);
      for (const site of scenario.ground_sites) {
        const offline = snapshot.gateway_down[site.id];
        const out = offline ? down : site.role === "gateway" ? gateways : clients;
        out.push(...coverageRing(positions.get(site.id)!, angle, radius));
        // These contacts are read from the same elevation results used by routing.
        if (!offline) for (const entry of snapshot.elevation_deg[site.id] ?? []) {
          if (entry.visible) append(groundLinks, site.id, entry.satellite_id);
        }
      }
    }
    return Object.fromEntries(Object.entries({ isl, route, footprints, clients, gateways, groundLinks, down }).map(([key, value]) => [key, new Float32Array(value)])) as Record<"isl" | "route" | "footprints" | "clients" | "gateways" | "groundLinks" | "down", Float32Array>;
  }, [positions, snapshot, scenario.environment, scenario.ground_sites, props.showAllIsl, props.routeEdgePairs, props.satelliteCoverage, props.groundCoverage]);
  const select = (e: ThreeEvent<MouseEvent>) => {
    // Orbit drags must not also select objects.
    if (e.delta > 4 || e.instanceId === undefined) return;
    e.stopPropagation();
    const node = nodes[e.instanceId];
    if (node) onSelect({ id: node.id, kind: node.kind });
  };
  const selectedPosition = selectedNode ? positions.get(selectedNode.id) : null;
  return (
    <>
      <Controls resetKey={props.resetKey} />
      <Earth />
      <Segments points={lines.footprints} color="#6fa8ff" opacity={0.3} />
      <Segments points={lines.clients} color="#4fd1c5" opacity={0.65} />
      <Segments points={lines.gateways} color="#ff9f45" opacity={0.65} />
      <Segments points={lines.down} color="#ef6b6b" opacity={0.35} />
      <Segments points={lines.groundLinks} color="#4fd1c5" opacity={0.4} />
      <Segments points={lines.isl} color="#4a5b78" opacity={0.5} />
      <RouteLinks points={lines.route} />
      {scenario.ground_sites.map((site) => <GroundLabel key={site.id} name={site.name} position={positions.get(site.id)!} color={snapshot.gateway_down[site.id] ? "#ef6b6b" : site.role === "gateway" ? "#ff9f45" : "#4fd1c5"} />)}
      <instancedMesh key={nodes.length} ref={markerMesh} args={[undefined, undefined, nodes.length]} onClick={select}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial />
      </instancedMesh>
      {selectedPosition && <mesh position={selectedPosition} raycast={() => {}}>
        <sphereGeometry args={[0.023, 16, 12]} />
        <meshBasicMaterial color="#7ee6da" wireframe transparent opacity={0.6} depthWrite={false} />
      </mesh>}
    </>
  );
}
