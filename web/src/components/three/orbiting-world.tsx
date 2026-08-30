"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetId } from "@/lib/galaxy-types";
import { PLANET_META } from "@/lib/galaxy-types";
import { orbitWorldPosition } from "@/lib/neural-geometry";
import type { PlanetColony } from "@/lib/civilization";

function CityScatter({
  count,
  radius,
  color,
}: {
  count: number;
  radius: number;
  color: string;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const n = Math.max(0, Math.min(64, count));

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / Math.max(1, n - 1)) * 2;
      const rY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      dummy.position.set(
        Math.cos(theta) * rY * radius * 1.04,
        y * radius * 1.04,
        Math.sin(theta) * rY * radius * 1.04
      );
      dummy.lookAt(0, 0, 0);
      dummy.rotateX(Math.PI / 2);
      dummy.scale.set(0.035, 0.06 + (i % 6) * 0.018, 0.035);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.count = n;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [dummy, n, radius]);

  if (n === 0) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 64]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} roughness={0.35} />
    </instancedMesh>
  );
}

function PlanetBody({
  id,
  radius,
}: {
  id: PlanetId;
  radius: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const meta = PLANET_META[id];
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * (id === "observatory" ? 0.12 : 0.28);
  });

  return (
    <group>
      <mesh ref={ref}>
        {id === "atlas" ? (
          <icosahedronGeometry args={[radius, 1]} />
        ) : id === "observatory" ? (
          <sphereGeometry args={[radius * 0.72, 48, 32]} />
        ) : (
          <sphereGeometry args={[radius, id === "lumen" ? 64 : 48, id === "lumen" ? 64 : 36]} />
        )}
        {id === "lumen" ? (
          <meshPhysicalMaterial
            color={meta.accent}
            roughness={0.08}
            metalness={0.05}
            transmission={0.42}
            thickness={0.55}
            transparent
            opacity={0.92}
            emissive={meta.accent}
            emissiveIntensity={0.32}
          />
        ) : (
          <meshStandardMaterial
            color={meta.accent}
            roughness={id === "atlas" ? 0.78 : 0.32}
            metalness={id === "observatory" ? 0.72 : 0.28}
            flatShading={id === "atlas"}
            emissive={meta.accent}
            emissiveIntensity={id === "galley" ? 0.22 : 0.16}
          />
        )}
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[radius, 24, 18]} />
        <meshBasicMaterial color={meta.accent} transparent opacity={0.11} side={THREE.BackSide} />
      </mesh>
      {id === "observatory" ? (
        <mesh rotation={[Math.PI / 2.15, 0, 0.28]}>
          <ringGeometry args={[radius * 1.15, radius * 1.55, 64]} />
          <meshBasicMaterial color={meta.accent} transparent opacity={0.55} side={THREE.DoubleSide} />
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
          <meshBasicMaterial color={meta.accentSoft} transparent opacity={0.45} />
        </mesh>
      ) : null}
    </group>
  );
}

export function OrbitingWorld({
  id,
  colony,
  name,
  interactive,
  onSelect,
}: {
  id: PlanetId;
  colony: PlanetColony;
  name: string;
  interactive?: boolean;
  onSelect?: (id: PlanetId) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const meta = PLANET_META[id];
  const { a, eccentricity, inclination, phase, periodSec, radius } = meta.orbit;
  const ringPts = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      pts.push(orbitWorldPosition(a, eccentricity, (i / 128) * Math.PI * 2, inclination));
    }
    return pts;
  }, [a, eccentricity, inclination]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const angle = phase + (clock.getElapsedTime() * Math.PI * 2) / periodSec;
    const p = orbitWorldPosition(a, eccentricity, angle, inclination);
    group.current.position.copy(p);
    const pulse = hovered ? 1.12 : 1;
    group.current.scale.setScalar(pulse);
  });

  const buildings = Math.min(64, colony.buildings.length * 8 + Math.round(colony.population / 4));

  return (
    <group>
      <Line points={ringPts} color={meta.accent} transparent opacity={0.22} lineWidth={1} />
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
        <PlanetBody id={id} radius={radius} />
        <CityScatter count={buildings} radius={radius} color={meta.accentSoft} />
        {hovered ? (
          <Html distanceFactor={10} position={[0, radius + 0.55, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
            <div className="w-56 rounded-2xl border border-white/15 bg-[#05070Fcc] p-3 text-left shadow-[0_0_28px_rgba(76,224,255,0.18)] backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: meta.accent }}>
                {meta.domain}
              </div>
              <div className="mt-0.5 text-sm font-bold text-white">{name}</div>
              <div className="mt-1 text-[11px] text-white/55">{colony.headline}</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-white/70">
                <span>Pop {colony.population}</span>
                <span>{colony.buildings.length} buildings</span>
                <span>{meta.cadence}</span>
                <span>{Math.round(periodSec)}s orbit</span>
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

export function PortraitPlanet({ id, colony }: { id: PlanetId; colony?: PlanetColony }) {
  const radius = PLANET_META[id].orbit.radius * 2.4;
  const buildings = colony
    ? Math.min(64, colony.buildings.length * 10 + Math.round(colony.population / 3))
    : 8;
  return (
    <group>
      <PlanetBody id={id} radius={radius} />
      <CityScatter count={buildings} radius={radius} color={PLANET_META[id].accentSoft} />
    </group>
  );
}
