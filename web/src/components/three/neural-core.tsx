"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { buildNeuralGraph } from "@/lib/neural-geometry";
import type { FirstMateMood } from "@/lib/galaxy-types";

const CORE_CYAN = "#7AF0FF";
const CORE_VIOLET = "#C4B5FF";

export function NeuralCore({
  mood = "idle",
  onSelect,
}: {
  mood?: FirstMateMood;
  onSelect?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
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
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const spin = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const current = moodRef.current;
    const calm = reduceMotion;

    let spinRate = 0.03;
    let sparkMul = 0.35;
    let beat = 0.12;
    if (current === "thinking") {
      spinRate = calm ? 0 : 1.65;
      sparkMul = 2.4;
      beat = 0;
    } else if (current === "talking") {
      spinRate = 0;
      sparkMul = 1.1;
      beat = 0.5 + 0.5 * Math.sin(t * 5.2);
    } else if (current === "listening") {
      spinRate = 0;
      sparkMul = 0.8;
      beat = 0.35 + 0.35 * Math.sin(t * 1.6);
    }

    if (group.current) {
      if (!calm) {
        spin.current += dt * spinRate;
        group.current.rotation.y = spin.current;
        group.current.rotation.x = Math.sin(t * 0.17) * (current === "thinking" ? 0.14 : 0.04);
      }
      const s = current === "talking" && !calm ? 1 + beat * 0.12 : current === "listening" && !calm ? 1 + beat * 0.04 : 1;
      group.current.scale.setScalar(s);
    }
    if (pulse.current) {
      const mat = pulse.current.material as THREE.MeshBasicMaterial;
      if (current === "talking") {
        mat.opacity = 0.12 + beat * 0.28;
        pulse.current.scale.setScalar(1.2 + beat * 0.35);
      } else if (current === "listening") {
        mat.opacity = 0.1 + beat * 0.12;
        pulse.current.scale.setScalar(1.12 + beat * 0.1);
      } else if (current === "thinking") {
        mat.opacity = 0.14;
        pulse.current.scale.setScalar(1.08);
      } else {
        mat.opacity = 0.06;
        pulse.current.scale.setScalar(1.05);
      }
    }
    sparks.forEach((spark, i) => {
      const mesh = sparkRefs.current[i];
      if (!mesh || spark.pts.length < 2) return;
      const u = (t * spark.speed * sparkMul + spark.phase) % 1;
      const idx = Math.min(spark.pts.length - 1, Math.floor(u * (spark.pts.length - 1)));
      const p = spark.pts[idx];
      mesh.position.copy(p);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = current === "idle" ? 0.2 : 0.35 + Math.sin(u * Math.PI) * 0.65;
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
      <mesh
        onPointerDown={(event) => {
          if (!onSelect) return;
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          if (!onSelect) return;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.92, 20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight color={CORE_CYAN} intensity={18} distance={9} decay={2} />
      <pointLight color={CORE_VIOLET} intensity={10} distance={7} decay={2} position={[0.2, -0.15, 0.1]} />
    </group>
  );
}
