"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { buildNeuralGraph } from "@/lib/neural-geometry";

const CORE_CYAN = "#7AF0FF";
const CORE_VIOLET = "#C4B5FF";

export function NeuralCore() {
  const group = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const graph = useMemo(() => buildNeuralGraph(176, 64), []);
  const pointGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(graph.points.length * 3);
    graph.points.forEach((p, i) => {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [graph]);

  const sparks = useMemo(
    () =>
      graph.axons.slice(0, 28).map((pts, i) => ({
        pts,
        speed: 0.18 + (i % 7) * 0.05,
        phase: i * 0.37,
      })),
    [graph]
  );
  const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat = 0.5 + 0.5 * Math.sin(t * 2.15);
    if (group.current) {
      group.current.rotation.y = t * 0.12;
      group.current.rotation.x = Math.sin(t * 0.17) * 0.08;
      const s = 1 + beat * 0.045;
      group.current.scale.setScalar(s);
    }
    if (pulse.current) {
      const mat = pulse.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.07 + beat * 0.11;
      pulse.current.scale.setScalar(1.15 + beat * 0.18);
    }
    sparks.forEach((spark, i) => {
      const mesh = sparkRefs.current[i];
      if (!mesh || spark.pts.length < 2) return;
      const u = (t * spark.speed + spark.phase) % 1;
      const idx = Math.min(spark.pts.length - 1, Math.floor(u * (spark.pts.length - 1)));
      const p = spark.pts[idx];
      mesh.position.copy(p);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(u * Math.PI) * 0.65;
    });
  });

  return (
    <group ref={group}>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={CORE_VIOLET} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color="#EAF7FF" transparent opacity={0.35} />
      </mesh>
      <points geometry={pointGeo}>
        <pointsMaterial
          color={CORE_CYAN}
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </points>
      {graph.axons.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={i % 3 === 0 ? CORE_VIOLET : CORE_CYAN}
          lineWidth={i % 5 === 0 ? 1.6 : 1.05}
          transparent
          opacity={0.22 + (i % 4) * 0.06}
          dashed={i % 4 === 0}
          dashScale={14}
          dashSize={0.35}
          gapSize={0.55}
        />
      ))}
      {sparks.map((spark, i) => (
        <mesh
          key={`spark-${i}`}
          ref={(el) => {
            sparkRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
        </mesh>
      ))}
      <pointLight color={CORE_CYAN} intensity={18} distance={9} decay={2} />
      <pointLight color={CORE_VIOLET} intensity={10} distance={7} decay={2} position={[0.2, -0.15, 0.1]} />
    </group>
  );
}
