"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GalaxyStore, PlanetId } from "@/lib/galaxy-types";
import { planetView } from "@/lib/galaxy-types";
import type { PlanetColony } from "@/lib/civilization";
import { VoxelBuildingField } from "./voxel-building";

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

export function PlanetSurfaceScene({
  id,
  colony,
  store,
}: {
  id: PlanetId;
  colony: PlanetColony;
  store: GalaxyStore;
}) {
  const meta = planetView(store, id);
  const walkers = useMemo(() => {
    if (colony.citizens.length === 0) return [];
    return Array.from(
      { length: Math.min(14, Math.max(2, Math.ceil(colony.population / 8))) },
      (_, i) => i
    );
  }, [colony.citizens.length, colony.population]);

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
      <VoxelBuildingField buildings={colony.buildings} color={meta.accent} mode="surface" />
      {walkers.map((i) => (
        <Walker key={i} color={meta.accentSoft} seed={i * 1.7 + 0.2} />
      ))}
      <hemisphereLight args={["#c8e4ff", "#1a1020", 0.45]} />
      <pointLight position={[2, 3, 2]} intensity={40} color={meta.accent} />
      <pointLight position={[-2, 1.4, -1]} intensity={18} color={meta.accentSoft} />
      <ambientLight intensity={0.35} />
    </group>
  );
}
