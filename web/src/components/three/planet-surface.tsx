"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetId } from "@/lib/galaxy-types";
import { PLANET_META } from "@/lib/galaxy-types";
import type { PlanetColony } from "@/lib/civilization";

function hash(n: number) {
  const x = Math.sin(n * 999) * 43758.5453;
  return x - Math.floor(x);
}

function Walker({
  color,
  seed,
}: {
  color: string;
  seed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const r = 0.55 + hash(seed) * 1.4;
  const speed = 0.25 + hash(seed + 2) * 0.45;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + seed;
    ref.current.position.set(Math.cos(t) * r, 0.08, Math.sin(t) * r);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.07, 0]}>
        <capsuleGeometry args={[0.035, 0.07, 4, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function BuildingMesh({
  index,
  color,
  scale,
  name,
}: {
  index: number;
  color: string;
  scale: number;
  name: string;
}) {
  const a = (index / 8) * Math.PI * 2 + index * 0.4;
  const r = 0.7 + (index % 3) * 0.35;
  const h = 0.28 * scale + (index % 4) * 0.08;
  return (
    <group position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]}>
      <mesh>
        <boxGeometry args={[0.18 * scale, h, 0.18 * scale]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
      <Html distanceFactor={6} position={[0, h / 2 + 0.12, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/80">
          {name}
        </div>
      </Html>
    </group>
  );
}

export function PlanetSurfaceScene({
  id,
  colony,
}: {
  id: PlanetId;
  colony: PlanetColony;
}) {
  const meta = PLANET_META[id];
  const walkers = useMemo(
    () => Array.from({ length: Math.min(14, Math.max(2, Math.ceil(colony.population / 8))) }, (_, i) => i),
    [colony.population]
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#0b1020" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.6, 3.05, 64]} />
        <meshBasicMaterial color={meta.accent} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 24, 16]} />
        <meshStandardMaterial color={meta.accent} emissive={meta.accent} emissiveIntensity={0.6} />
      </mesh>
      {colony.buildings.map((b, i) => (
        <BuildingMesh key={b.id} index={i} color={meta.accent} scale={b.scale} name={b.name} />
      ))}
      {walkers.map((i) => (
        <Walker key={i} color={meta.accentSoft} seed={i * 1.7 + 0.2} />
      ))}
      <pointLight position={[2, 3, 2]} intensity={40} color={meta.accent} />
      <pointLight position={[-2, 1.4, -1]} intensity={18} color={meta.accentSoft} />
      <ambientLight intensity={0.35} />
    </group>
  );
}
