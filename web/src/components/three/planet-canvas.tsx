"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { FirstMateMood, GalaxyStore, PlanetId, Signal } from "@/lib/galaxy-types";
import { emptyStore, planetView } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";
import { orbitWorldPosition } from "@/lib/neural-geometry";
import { NeuralCore } from "./neural-core";
import { OrbitingWorld, PortraitPlanet } from "./orbiting-world";
import { PlanetSurfaceScene } from "./planet-surface";
import { GalacticFleet } from "./galactic-craft";

function SignalCraft({
  signal,
  store,
}: {
  signal: Signal;
  store: GalaxyStore;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const fromView = planetView(store, signal.from);
  const toView = planetView(store, signal.to);
  const from = fromView.orbit;
  const to = toView.orbit;
  const enabledFrom = store.planets.find((p) => p.id === signal.from)?.enabled !== false;
  const enabledTo = store.planets.find((p) => p.id === signal.to)?.enabled !== false;

  useFrame(({ clock }) => {
    if (!mesh.current || !enabledFrom || !enabledTo) return;
    const t = clock.getElapsedTime();
    const u = (t * 0.12 + signal.created_at * 0.00001) % 1;
    const aFrom = from.phase + (t * Math.PI * 2) / from.periodSec;
    const aTo = to.phase + (t * Math.PI * 2) / to.periodSec;
    const A = orbitWorldPosition(from.a, from.eccentricity, aFrom, from.inclination);
    const B = orbitWorldPosition(to.a, to.eccentricity, aTo, to.inclination);
    const bow = Math.sin(Math.PI * u);
    mesh.current.position.set(
      A.x + (B.x - A.x) * u,
      A.y + (B.y - A.y) * u + bow * 0.55,
      A.z + (B.z - A.z) * u - bow * 0.35
    );
  });

  if (!enabledFrom || !enabledTo) return null;

  return (
    <mesh ref={mesh}>
      <octahedronGeometry args={[0.045, 0]} />
      <meshBasicMaterial color={fromView.accent} />
    </mesh>
  );
}

function SystemScene({
  store,
  names,
  interactive,
  onSelect,
  coreMood,
  onSelectCore,
}: {
  store: GalaxyStore;
  names?: Partial<Record<PlanetId, string>>;
  interactive?: boolean;
  onSelect?: (id: PlanetId) => void;
  coreMood?: FirstMateMood;
  onSelectCore?: () => void;
}) {
  const enabled = store.planets.filter((p) => p.enabled);
  const inFlight = store.signals.filter((s) => !s.seen).slice(0, 10);

  return (
    <>
      <color attach="background" args={["#03050B"]} />
      <fog attach="fog" args={["#03050B", 10, 22]} />
      <ambientLight intensity={0.28} />
      <hemisphereLight args={["#9ad4ff", "#12081a", 0.4]} />
      <directionalLight position={[6, 8, 4]} intensity={1.15} color="#fff6ea" />
      <Stars radius={90} depth={50} count={1600} factor={3.2} saturation={0} fade speed={0.45} />
      <NeuralCore mood={coreMood} onSelect={onSelectCore} />
      {enabled.map((planet) => {
        const view = planetView(store, planet.id);
        return (
          <OrbitingWorld
            key={planet.id}
            id={planet.id}
            view={view}
            name={names?.[planet.id] ?? planet.name}
            colony={planetColony(store, planet.id)}
            interactive={interactive}
            onSelect={onSelect}
          />
        );
      })}
      {inFlight.map((signal) => (
        <SignalCraft key={signal.id} signal={signal} store={store} />
      ))}
      <GalacticFleet store={store} />
    </>
  );
}

function PortraitScene({ planet, store }: { planet: PlanetId; store: GalaxyStore }) {
  const view = planetView(store, planet);
  return (
    <>
      <color attach="background" args={["#05070F"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 2, 4]} intensity={55} color={view.accent} />
      <pointLight position={[-3, -1, 2]} intensity={18} color={view.accentSoft} />
      <Stars radius={60} depth={30} count={700} factor={2.4} saturation={0} fade speed={0.35} />
      <PortraitPlanet id={planet} view={view} colony={planetColony(store, planet)} />
    </>
  );
}

function SurfaceScene({ planet, store }: { planet: PlanetId; store: GalaxyStore }) {
  return (
    <>
      <color attach="background" args={["#05070F"]} />
      <Stars radius={50} depth={24} count={500} factor={2} saturation={0} fade speed={0.2} />
      <PlanetSurfaceScene id={planet} store={store} colony={planetColony(store, planet)} />
    </>
  );
}

export function PlanetCanvas({
  planet,
  className,
  store,
  names,
  interactive,
  view,
  onSelectPlanet,
  onSelectCore,
  coreMood,
}: {
  planet: PlanetId | "bridge";
  className?: string;
  store?: GalaxyStore;
  names?: Partial<Record<PlanetId, string>>;
  interactive?: boolean;
  view?: "system" | "portrait" | "surface";
  onSelectPlanet?: (id: PlanetId) => void;
  onSelectCore?: () => void;
  coreMood?: FirstMateMood;
}) {
  const data = store ?? emptyStore();
  const mode = view ?? (planet === "bridge" ? "system" : "portrait");
  const farthest = Math.max(
    6,
    ...data.planets.filter((p) => p.enabled).map((p) => planetView(data, p.id).orbit.a)
  );
  const camera = useMemo(() => {
    if (mode === "system") {
      return { position: [0, 2.6, Math.max(9.2, farthest + 3.2)] as [number, number, number], fov: 42 };
    }
    if (mode === "surface") return { position: [2.4, 2.2, 3.4] as [number, number, number], fov: 46 };
    return { position: [0, 0.4, 4.2] as [number, number, number], fov: 42 };
  }, [mode, farthest]);

  return (
    <div className={className}>
      <Canvas camera={camera} gl={{ antialias: true, alpha: true }} dpr={[1, 1.75]}>
        <Suspense fallback={null}>
          {mode === "system" ? (
            <SystemScene
              store={data}
              names={names}
              interactive={interactive}
              onSelect={onSelectPlanet}
              coreMood={coreMood}
              onSelectCore={onSelectCore}
            />
          ) : mode === "surface" ? (
            planet !== "bridge" ? <SurfaceScene planet={planet} store={data} /> : null
          ) : planet !== "bridge" ? (
            <PortraitScene planet={planet} store={data} />
          ) : null}
        </Suspense>
        {interactive || mode === "system" ? (
          <OrbitControls
            enablePan={false}
            enableDamping
            minDistance={mode === "surface" ? 1.6 : 3.2}
            maxDistance={mode === "surface" ? 8 : 16}
            maxPolarAngle={Math.PI * 0.72}
            minPolarAngle={Math.PI * 0.18}
          />
        ) : mode === "portrait" ? (
          <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
        ) : (
          <OrbitControls enablePan={false} minDistance={1.8} maxDistance={7} />
        )}
      </Canvas>
    </div>
  );
}
