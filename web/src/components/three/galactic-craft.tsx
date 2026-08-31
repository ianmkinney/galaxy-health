"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { GalacticCraftKind, GalacticEvent, GalaxyStore } from "@/lib/galaxy-types";
import { planetView } from "@/lib/galaxy-types";
import { orbitWorldPosition } from "@/lib/neural-geometry";
import { CRAFT_META, eventUrgency, formatDue, hashString } from "@/lib/galactic-events";

function eventWorldPosition(event: GalacticEvent, store: GalaxyStore, t: number) {
  const seed = hashString(event.id);
  const urgency = eventUrgency(event);
  const wobble = Math.sin(t * 0.7 + seed * 12) * 0.1;

  if (event.planet_id && store.planets.some((p) => p.id === event.planet_id && p.enabled !== false)) {
    const view = planetView(store, event.planet_id);
    const { a, eccentricity, inclination, phase, periodSec, radius } = view.orbit;
    const angle = phase + (t * Math.PI * 2) / periodSec + seed * 0.85;
    const planet = orbitWorldPosition(a, eccentricity, angle, inclination);
    const radial = planet.clone().normalize();
    const dist = radius + 0.42 + (1 - urgency) * 0.28 + seed * 0.12;
    return planet.add(radial.multiplyScalar(dist)).add(new THREE.Vector3(0, wobble, 0));
  }

  const farthest = Math.max(
    5.5,
    ...store.planets.filter((p) => p.enabled).map((p) => planetView(store, p.id).orbit.a)
  );
  const a = farthest + 0.95 + seed * 0.55;
  const angle = seed * Math.PI * 2 + t * 0.08;
  const pos = orbitWorldPosition(a, 0.07, angle, 0.12 + seed * 0.22);
  pos.y += wobble;
  return pos;
}

function Hull({ color, emissive = 0.5 }: { color: string; emissive?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={emissive}
      metalness={0.62}
      roughness={0.28}
    />
  );
}

function WarshipMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.22, 0.038, 0.07]} />
        <Hull color={color} emissive={0.55} />
      </mesh>
      <mesh position={[0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.028, 0.09, 4]} />
        <Hull color={color} emissive={0.7} />
      </mesh>
      <mesh position={[-0.04, 0, 0.08]}>
        <boxGeometry args={[0.1, 0.01, 0.12]} />
        <Hull color={color} emissive={0.35} />
      </mesh>
      <mesh position={[-0.04, 0, -0.08]}>
        <boxGeometry args={[0.1, 0.01, 0.12]} />
        <Hull color={color} emissive={0.35} />
      </mesh>
      <mesh position={[-0.1, 0.02, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.03]} />
        <meshBasicMaterial color="#fff4e8" />
      </mesh>
    </group>
  );
}

function EnvoyMesh({ color }: { color: string }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.2, 8]} />
        <Hull color={color} emissive={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.008, 8, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <pointLight color={color} intensity={4} distance={1.4} />
    </group>
  );
}

function MonsterMesh({ color }: { color: string }) {
  const tentacles = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!tentacles.current) return;
    const t = clock.getElapsedTime();
    tentacles.current.rotation.y = t * 0.8;
    tentacles.current.children.forEach((child, i) => {
      child.position.set(
        Math.cos(t * 1.4 + i) * 0.12,
        Math.sin(t * 1.1 + i * 1.7) * 0.08,
        Math.sin(t * 0.9 + i) * 0.12
      );
    });
  });
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          roughness={0.7}
          flatShading
        />
      </mesh>
      <group ref={tentacles}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <cylinderGeometry args={[0.006, 0.018, 0.16, 5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function AstronautMesh({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const pulse = (Math.sin(clock.getElapsedTime() * 3) + 1) / 2;
    if (group.current) group.current.scale.setScalar(0.85 + pulse * 0.12);
    if (light.current) light.current.intensity = 3 + pulse * 6;
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.028, 12, 10]} />
        <meshStandardMaterial color="#e8f6ff" emissive={color} emissiveIntensity={0.4} metalness={0.3} />
      </mesh>
      <mesh>
        <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <pointLight ref={light} color={color} intensity={4} distance={1.8} />
    </group>
  );
}

function CraftBody({ craft, color }: { craft: GalacticCraftKind; color: string }) {
  if (craft === "armada") {
    return (
      <group>
        <group position={[0.08, 0.04, 0.05]}>
          <WarshipMesh color={color} scale={0.72} />
        </group>
        <group position={[-0.1, -0.02, 0.08]}>
          <WarshipMesh color={color} scale={0.58} />
        </group>
        <group position={[0.02, -0.06, -0.1]}>
          <WarshipMesh color={color} scale={0.5} />
        </group>
      </group>
    );
  }
  if (craft === "envoy") return <EnvoyMesh color={color} />;
  if (craft === "monster") return <MonsterMesh color={color} />;
  if (craft === "astronaut") return <AstronautMesh color={color} />;
  return <WarshipMesh color={color} />;
}

export function GalacticCraft({ event, store }: { event: GalacticEvent; store: GalaxyStore }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const meta = CRAFT_META[event.craft] ?? CRAFT_META.warship;
  const look = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const pos = eventWorldPosition(event, store, t);
    const next = eventWorldPosition(event, store, t + 0.08);
    group.current.position.copy(pos);
    look.current.copy(next);
    group.current.lookAt(look.current);
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <CraftBody craft={event.craft} color={meta.color} />
      {hovered ? (
        <Html
          distanceFactor={9}
          position={[0, 0.28, 0]}
          style={{ pointerEvents: "none" }}
          zIndexRange={[30, 0]}
        >
          <div className="w-52 rounded-2xl border border-white/15 bg-[#05070Fcc] p-3 shadow-[0_0_24px_rgba(76,224,255,0.16)] backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: meta.ink }}>
              {meta.label} · {event.tone}
            </div>
            <div className="mt-0.5 text-sm font-bold text-white">{event.title}</div>
            <div className="mt-1 text-[11px] text-white/55">{event.briefing}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
              {formatDue(event.due_at)}
              {event.planet_id ? ` · ${planetView(store, event.planet_id).name}` : " · deep space"}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function GalacticFleet({ store }: { store: GalaxyStore }) {
  const fleet = (store.events ?? []).filter((event) => event.status !== "done").slice(0, 16);
  return (
    <>
      {fleet.map((event) => (
        <GalacticCraft key={event.id} event={event} store={store} />
      ))}
    </>
  );
}
