"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlanetId } from "@/lib/galaxy-types";
import { PLANET_META } from "@/lib/galaxy-types";

function PlanetMesh({
  color,
  detail,
}: {
  color: string;
  detail: "galley" | "atlas" | "lumen" | "observatory" | "star";
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * (detail === "observatory" ? 0.15 : 0.35);
    ref.current.rotation.x += dt * 0.05;
  });

  const mats = useMemo(() => {
    if (detail === "galley") {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.55,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.18,
      });
    }
    if (detail === "atlas") {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.2,
        flatShading: true,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.12,
      });
    }
    if (detail === "lumen") {
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.1,
        metalness: 0,
        transmission: 0.35,
        thickness: 0.6,
        transparent: true,
        opacity: 0.92,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.35,
      });
    }
    if (detail === "observatory") {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.7,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.2,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#FFE6A3",
      emissive: "#FFC857",
      emissiveIntensity: 1.2,
    });
  }, [color, detail]);

  return (
    <Float speed={detail === "lumen" ? 2.2 : 1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} material={mats} scale={detail === "observatory" ? 1.1 : 1}>
        {detail === "atlas" ? (
          <icosahedronGeometry args={[1, 0]} />
        ) : detail === "observatory" ? (
          <torusGeometry args={[0.85, 0.28, 16, 48]} />
        ) : (
          <sphereGeometry args={[1, detail === "lumen" ? 64 : 48, detail === "lumen" ? 64 : 48]} />
        )}
      </mesh>
      {detail === "observatory" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.45, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {detail === "galley" ? (
        <mesh scale={1.08}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      ) : null}
    </Float>
  );
}

function Scene({ planet }: { planet: PlanetId | "bridge" }) {
  if (planet === "bridge") {
    return (
      <>
        <color attach="background" args={["#03050B"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[4, 3, 5]} intensity={40} color="#4CE0FF" />
        <pointLight position={[-4, -2, 2]} intensity={25} color="#A98BFF" />
        <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.6} />
        <PlanetMesh color="#FFE6A3" detail="star" />
        {(
          [
            ["galley", [-2.2, 0.4, 0]],
            ["atlas", [0.4, 1.5, -0.5]],
            ["lumen", [2.1, -0.2, 0.3]],
            ["observatory", [-0.6, -1.6, 0.2]],
          ] as const
        ).map(([id, pos]) => (
          <group key={id} position={pos} scale={0.45}>
            <PlanetMesh color={PLANET_META[id].accent} detail={id} />
          </group>
        ))}
      </>
    );
  }

  const meta = PLANET_META[planet];
  return (
    <>
      <color attach="background" args={["#05070F"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 2, 4]} intensity={55} color={meta.accent} />
      <pointLight position={[-3, -1, 2]} intensity={20} color={meta.accentSoft} />
      <Stars radius={60} depth={30} count={800} factor={2.5} saturation={0} fade speed={0.4} />
      <PlanetMesh color={meta.accent} detail={planet} />
    </>
  );
}

export function PlanetCanvas({
  planet,
  className,
}: {
  planet: PlanetId | "bridge";
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <Scene planet={planet} />
      </Canvas>
    </div>
  );
}
