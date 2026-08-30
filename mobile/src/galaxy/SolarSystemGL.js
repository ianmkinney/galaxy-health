// The WebGL renderer: same props as the SVG SolarSystem, real 3D underneath.
//
// This is the alternate drawing layer. It consumes the identical orbital model
// from math3d/planets, which is the whole point of keeping the maths separate
// from the drawing: the scene is described once and can be rasterised by SVG on
// the CPU or by three.js on the GPU without the model changing.
//
// Trade-off versus the SVG renderer, measured rather than assumed:
//   - real perspective, real depth sorting, real raycast picking (onPointerDown
//     on the mesh, no invisible touch targets to keep in sync)
//   - but it animates from useFrame on the JS thread, so it gives up the SVG
//     renderer's UI-thread Reanimated driver and is exposed to JS-thread stalls
//   - and it adds ~1.1 MB of three.js to the bundle
//
// Not wired into BridgeScreen by default. See render-stack.md in the vault.

import React, { memo, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Canvas, useFrame } from './GLCanvas';
import { motion, planetAccents, starColor } from '../theme';
import { CAMERA, orbitAngle, orbitPoint, signalPoint, TILT_COS, TILT_SIN } from './math3d';
import { STAR } from './planets';

// The SVG renderer sizes bodies in px. Divide by this to land in world units so
// both renderers agree on relative scale.
const PX_PER_UNIT = 240;

// Where the system is parked when motion is reduced. Matches useOrbitClock.
const STILL_T = 0.12;

const loopProgress = (elapsedSeconds) =>
  (elapsedSeconds * 1000 / motion.orbit.loopMs) % 1;

/* ------------------------------------------------------------------ bodies */

const Planet = ({ planet, animate, onSelect }) => {
  const group = useRef(null);
  const { a, revs, phase, eccentricity } = planet.orbit;
  const accent = planetAccents[planet.id];
  const radius = planet.body.radius / PX_PER_UNIT;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = animate ? loopProgress(clock.getElapsedTime()) : STILL_T;
    const point = orbitPoint(a, eccentricity, orbitAngle(phase, revs, t));
    group.current.position.set(point.x, point.y, point.z);
  });

  return (
    <group ref={group}>
      <mesh onPointerDown={onSelect ? () => onSelect(planet) : undefined}>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshStandardMaterial
          color={accent.mid}
          emissive={accent.core}
          emissiveIntensity={0.28}
          roughness={0.62}
          metalness={0.08}
        />
      </mesh>
      {/* Atmospheric shell. Backface-rendered so it reads as haze, not a shell. */}
      <mesh scale={1.22}>
        <sphereGeometry args={[radius, 24, 18]} />
        <meshBasicMaterial color={accent.core} transparent opacity={0.12} side={1} />
      </mesh>
      {planet.body.ring ? (
        <mesh rotation={[Math.PI / 2.1, 0, 0.3]}>
          <ringGeometry args={[radius * 1.5, radius * 2.2, 48]} />
          <meshBasicMaterial color={accent.core} transparent opacity={0.32} side={2} />
        </mesh>
      ) : null}
    </group>
  );
};

const OrbitRing = ({ planet }) => {
  const positions = useMemo(() => {
    const segments = 128;
    const arr = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i += 1) {
      const point = orbitPoint(
        planet.orbit.a,
        planet.orbit.eccentricity,
        (i / segments) * Math.PI * 2
      );
      arr[i * 3] = point.x;
      arr[i * 3 + 1] = point.y;
      arr[i * 3 + 2] = point.z;
    }
    return arr;
  }, [planet.orbit.a, planet.orbit.eccentricity]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={planetAccents[planet.id].core}
        transparent
        opacity={0.22}
      />
    </line>
  );
};

const Star = () => {
  const graph = useMemo(() => {
    const n = 64;
    const positions = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const radius = STAR.radius / PX_PER_UNIT;
    for (let i = 0; i < n; i += 1) {
      const y = 1 - (i / (n - 1)) * 2;
      const rY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const r = radius * (1 + 0.1 * Math.sin(3 * theta));
      positions[i * 3] = Math.cos(theta) * rY * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = Math.sin(theta) * rY * r;
    }
    return positions;
  }, []);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[graph, 3]} />
        </bufferGeometry>
        <pointsMaterial color={starColor.core} size={0.035} transparent opacity={0.95} />
      </points>
      <mesh>
        <sphereGeometry args={[STAR.radius / PX_PER_UNIT * 0.28, 16, 12]} />
        <meshBasicMaterial color={starColor.mid} transparent opacity={0.22} />
      </mesh>
      <pointLight intensity={1.6} distance={12} decay={1.4} color={starColor.core} />
    </group>
  );
};

/* ----------------------------------------------------------------- signals */

const SignalCraft = ({ signal, planets, animate }) => {
  const mesh = useRef(null);
  const from = planets.find((p) => p.id === signal.fromPlanet);
  const to = planets.find((p) => p.id === signal.toPlanet);

  useFrame(({ clock }) => {
    if (!mesh.current || !from || !to) return;
    const elapsed = clock.getElapsedTime();
    const orbitT = animate ? loopProgress(elapsed) : STILL_T;
    const flightT = animate
      ? (elapsed * 1000 / motion.signal.flightMs) % 1
      : 0.5;

    const a = orbitPoint(
      from.orbit.a,
      from.orbit.eccentricity,
      orbitAngle(from.orbit.phase, from.orbit.revs, orbitT)
    );
    const b = orbitPoint(
      to.orbit.a,
      to.orbit.eccentricity,
      orbitAngle(to.orbit.phase, to.orbit.revs, orbitT)
    );
    const point = signalPoint(a, b, flightT);
    mesh.current.position.set(point.x, point.y, point.z);
  });

  if (!from || !to) return null;

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.022, 12, 10]} />
      <meshBasicMaterial color={planetAccents[from.id].core} />
    </mesh>
  );
};

/* ------------------------------------------------------------------- scene */

const Scene = ({ planets, signals, animate, onSelectPlanet }) => (
  <>
    <ambientLight intensity={0.35} />
    <Star />
    {planets.map((planet) => (
      <OrbitRing key={'ring-' + planet.id} planet={planet} />
    ))}
    {planets.map((planet) => (
      <Planet
        key={planet.id}
        planet={planet}
        animate={animate}
        onSelect={onSelectPlanet}
      />
    ))}
    {signals.map((signal) => (
      <SignalCraft
        key={signal.id}
        signal={signal}
        planets={planets}
        animate={animate}
      />
    ))}
  </>
);

const SolarSystemGL = ({
  width,
  height,
  planets = [],
  signals = [],
  animate = true,
  onSelectPlanet,
}) => {
  // Match the SVG renderer's camera so switching renderers does not reframe the
  // scene: same tilt above the ecliptic, same distance out along -Z.
  const cameraPosition = useMemo(
    () => [0, CAMERA.distance * TILT_SIN, -CAMERA.distance * TILT_COS],
    []
  );

  return (
    <View style={[styles.canvas, { width, height }]}>
      <Canvas
        camera={{ position: cameraPosition, fov: 45, near: 0.05, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        style={StyleSheet.absoluteFill}
      >
        <Scene
          planets={planets}
          signals={signals}
          animate={animate}
          onSelectPlanet={onSelectPlanet}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: { position: 'absolute', top: 0, left: 0 },
});

export default memo(SolarSystemGL);
