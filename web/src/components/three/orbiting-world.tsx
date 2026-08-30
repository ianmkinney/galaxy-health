"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetId, PlanetView } from "@/lib/galaxy-types";
import { orbitWorldPosition } from "@/lib/neural-geometry";
import type { PlanetColony } from "@/lib/civilization";
import { VoxelBuildingField } from "./voxel-building";

function GlobeSpin({ speed, children }: { speed: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

function PlanetBody({
  id,
  radius,
  accent,
  accentSoft,
}: {
  id: PlanetId;
  radius: number;
  accent: string;
  accentSoft: string;
}) {
  return (
    <group>
      <mesh>
        {id === "atlas" ? (
          <icosahedronGeometry args={[radius, 1]} />
        ) : id === "observatory" ? (
          <sphereGeometry args={[radius * 0.72, 48, 32]} />
        ) : (
          <sphereGeometry args={[radius, id === "lumen" ? 64 : 48, id === "lumen" ? 64 : 36]} />
        )}
        {id === "lumen" ? (
          <meshPhysicalMaterial
            color={accent}
            roughness={0.08}
            metalness={0.05}
            transmission={0.42}
            thickness={0.55}
            transparent
            opacity={0.92}
            emissive={accent}
            emissiveIntensity={0.32}
          />
        ) : (
          <meshStandardMaterial
            color={accent}
            roughness={id === "atlas" ? 0.78 : 0.32}
            metalness={id === "observatory" ? 0.72 : 0.28}
            flatShading={id === "atlas"}
            emissive={accent}
            emissiveIntensity={id === "galley" ? 0.22 : 0.16}
          />
        )}
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[radius, 24, 18]} />
        <meshBasicMaterial color={accent} transparent opacity={0.11} side={THREE.BackSide} />
      </mesh>
      {id === "observatory" ? (
        <mesh rotation={[Math.PI / 2.15, 0, 0.28]}>
          <ringGeometry args={[radius * 1.15, radius * 1.55, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {id === "galley" ? (
        <mesh rotation={[0.4, 0.2, 0.1]}>
          <sphereGeometry args={[radius * 1.01, 24, 16]} />
          <meshBasicMaterial color="#FFD7A8" transparent opacity={0.08} />
        </mesh>
      ) : null}
      {id === "lumen" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.18, 0.018, 8, 64]} />
          <meshBasicMaterial color={accentSoft} transparent opacity={0.45} />
        </mesh>
      ) : null}
    </group>
  );
}

export function OrbitingWorld({
  id,
  colony,
  name,
  view,
  interactive,
  onSelect,
}: {
  id: PlanetId;
  colony: PlanetColony;
  name: string;
  view: PlanetView;
  interactive?: boolean;
  onSelect?: (id: PlanetId) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { a, eccentricity, inclination, phase, periodSec, radius } = view.orbit;
  const ringPts = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      pts.push(orbitWorldPosition(a, eccentricity, (i / 128) * Math.PI * 2, inclination));
    }
    return pts;
  }, [a, eccentricity, inclination]);
  const weathered = colony.buildings.filter((b) => b.condition !== "sound").length;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const angle = phase + (clock.getElapsedTime() * Math.PI * 2) / periodSec;
    const p = orbitWorldPosition(a, eccentricity, angle, inclination);
    group.current.position.copy(p);
    const pulse = hovered ? 1.12 : 1;
    group.current.scale.setScalar(pulse);
  });

  return (
    <group>
      <Line points={ringPts} color={view.accent} transparent opacity={0.22} lineWidth={1} />
      <group
        ref={group}
        onPointerOver={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          onSelect?.(id);
        }}
      >
        <GlobeSpin speed={id === "observatory" ? 0.12 : 0.28}>
          <PlanetBody id={id} radius={radius} accent={view.accent} accentSoft={view.accentSoft} />
          <VoxelBuildingField
            buildings={colony.buildings}
            color={view.accent}
            mode="orbit"
            planetRadius={id === "observatory" ? radius * 0.72 : radius}
          />
        </GlobeSpin>
        <pointLight
          position={[0, radius * 2.4, radius * 1.6]}
          intensity={6}
          distance={radius * 8}
          color="#fff4e8"
        />
        {hovered ? (
          <Html distanceFactor={10} position={[0, radius + 0.55, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
            <div className="w-56 rounded-2xl border border-white/15 bg-[#05070Fcc] p-3 text-left shadow-[0_0_28px_rgba(76,224,255,0.18)] backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: view.accent }}>
                {view.domain}
              </div>
              <div className="mt-0.5 text-sm font-bold text-white">{name}</div>
              <div className="mt-1 text-[11px] text-white/55">{colony.headline}</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-white/70">
                <span>Pop {colony.population}</span>
                <span>{colony.buildings.length} buildings</span>
                <span>{view.cadence}</span>
                <span>
                  {weathered
                    ? `${weathered} weathering`
                    : colony.buildings.length
                      ? "structures sound"
                      : "uninhabited"}
                </span>
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
                Click to land · scroll to zoom
              </div>
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  );
}

export function PortraitPlanet({
  id,
  colony,
  view,
}: {
  id: PlanetId;
  colony?: PlanetColony;
  view: PlanetView;
}) {
  const radius = view.orbit.radius * 2.4;
  const bodyRadius = id === "observatory" ? radius * 0.72 : radius;
  return (
    <group>
      <GlobeSpin speed={0.18}>
        <PlanetBody id={id} radius={radius} accent={view.accent} accentSoft={view.accentSoft} />
        {colony ? (
          <VoxelBuildingField
            buildings={colony.buildings}
            color={view.accent}
            mode="orbit"
            planetRadius={bodyRadius}
          />
        ) : null}
      </GlobeSpin>
    </group>
  );
}
