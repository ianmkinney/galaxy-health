import React, { memo, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion, planetAccents, starColor, typography } from '../theme';
import {
  depthOpacity,
  orbitAngle,
  orbitPaths,
  orbitPoint,
  project,
  projectOrbit,
  projectStatic,
  signalPoint,
} from './math3d';
import { STAR } from './planets';
import { buildNeuralCore2d } from './neuralCore';
import PlanetBody from './PlanetBody';
import Starfield from './Starfield';

/* --------------------------------------------------------- orbiting planet */

const OrbitingPlanet = ({ planet, scale, clock, animate, onPress }) => {
  const accent = planetAccents[planet.id];
  const { a, revs, phase, eccentricity } = planet.orbit;
  const box = planet.body.radius * 4;

  const style = useAnimatedStyle(() => {
    const angle = orbitAngle(phase, revs, clock.value);
    const point = projectOrbit(a, eccentricity, angle, scale);
    return {
      opacity: depthOpacity(point.k),
      transform: [
        { translateX: point.sx },
        { translateY: point.sy },
        { scale: point.k },
      ],
    };
  }, [a, eccentricity, phase, revs, scale]);

  // Selection halo pulses so it is obvious the body is interactive.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!animate) return undefined;
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return undefined;
  }, [animate, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.3,
    transform: [{ scale: 0.94 + pulse.value * 0.12 }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.body,
        { width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            borderRadius: box / 2,
            borderColor: accent.core,
          },
          haloStyle,
        ]}
      />
      <PlanetBody radius={planet.body.radius} accent={accent} ring={planet.body.ring} box={box} />
      <Pressable
        onPress={() => onPress?.(planet)}
        style={styles.hit}
        accessibilityRole="button"
        accessibilityLabel={`Enter ${planet.name}`}
        hitSlop={10}
      />
      <View pointerEvents="none" style={styles.tag}>
        <Text
          numberOfLines={1}
          style={[styles.tagText, typography.hud, { color: accent.ink }]}
        >
          {planet.name}
        </Text>
      </View>
    </Animated.View>
  );
};

/* ------------------------------------------------------------ signal ship */

const NO_ORBIT = { a: 0, revs: 0, phase: 0, eccentricity: 0 };

const SignalShip = ({ signal, planetsById, scale, clock, animate, index }) => {
  const from = planetsById[signal.from];
  const to = planetsById[signal.to];
  const routed = Boolean(from && to);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate || !routed) return undefined;
    progress.value = 0;
    progress.value = withDelay(
      index * motion.signal.gapMs,
      withRepeat(
        withTiming(1, { duration: motion.signal.flightMs, easing: Easing.inOut(Easing.cubic) }),
        -1,
        false
      )
    );
    return undefined;
  }, [animate, index, progress, routed]);

  const accent = planetAccents[signal.from] ?? planetAccents.lumen;
  const fromOrbit = from?.orbit ?? NO_ORBIT;
  const toOrbit = to?.orbit ?? NO_ORBIT;

  const style = useAnimatedStyle(() => {
    const t = animate ? progress.value : 0.5;
    const src = orbitPoint(
      fromOrbit.a,
      fromOrbit.eccentricity,
      orbitAngle(fromOrbit.phase, fromOrbit.revs, clock.value)
    );
    const dst = orbitPoint(
      toOrbit.a,
      toOrbit.eccentricity,
      orbitAngle(toOrbit.phase, toOrbit.revs, clock.value)
    );

    const here = signalPoint(src, dst, t);
    const ahead = signalPoint(src, dst, t + 0.02 > 1 ? 1 : t + 0.02);
    const s = project(here.x, here.y, here.z, scale);
    const s2 = project(ahead.x, ahead.y, ahead.z, scale);
    const heading = (Math.atan2(s2.sy - s.sy, s2.sx - s.sx) * 180) / Math.PI;

    // Fade in on launch, out on approach, so the loop never pops.
    const envelope = Math.sin(Math.PI * t);
    return {
      opacity: animate ? Math.min(1, envelope * 2.4) : 0.9,
      transform: [
        { translateX: s.sx },
        { translateY: s.sy },
        { rotateZ: `${heading}deg` },
        { scale: 0.72 + s.k * 0.38 },
      ],
    };
  }, [animate, fromOrbit, scale, toOrbit]);

  if (!routed) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.ship, style]}>
      <Svg width={54} height={16}>
        <Defs>
          <RadialGradient id={`trail-${signal.id}`} cx="88%" cy="50%" r="72%">
            <Stop offset="0" stopColor={accent.core} stopOpacity="0.95" />
            <Stop offset="0.55" stopColor={accent.mid} stopOpacity="0.4" />
            <Stop offset="1" stopColor={accent.mid} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Exhaust trail behind, hull in front. +X is the direction of travel. */}
        <Path d="M0 8 L44 3.4 L44 12.6 Z" fill={`url(#trail-${signal.id})`} />
        <Path d="M40 8 L50 4.6 L54 8 L50 11.4 Z" fill={accent.core} />
        <Circle cx={47} cy={8} r={2.1} fill="#FFFFFF" opacity={0.95} />
      </Svg>
    </Animated.View>
  );
};

/* ---------------------------------------------------------------- system */

const SolarSystem = ({
  width,
  height,
  planets,
  signals = [],
  clock,
  animate = true,
  onSelectPlanet,
  horizon = 0.44,
}) => {
  const cx = width / 2;
  const cy = height * horizon;
  // Keep the widest orbit inside the canopy even at its nearest, largest pass.
  const scale = Math.min(width * 0.34, height * 0.32);

  const planetsById = useMemo(
    () => planets.reduce((acc, planet) => ({ ...acc, [planet.id]: planet }), {}),
    [planets]
  );

  const rings = useMemo(
    () =>
      planets.map((planet) => ({
        id: planet.id,
        ...orbitPaths(planet.orbit.a, planet.orbit.eccentricity, scale),
        accent: planetAccents[planet.id].mid,
      })),
    [planets, scale]
  );

  const starGlow = projectStatic(0, 0, 0, scale).k;
  const core = useMemo(() => buildNeuralCore2d(STAR.radius * 0.92 * starGlow, 42, 16), [starGlow]);

  return (
    <View style={[styles.root, { width, height }]}>
      <Starfield width={width} height={height} animate={animate} />

      {/* Static geometry: nebula, orbit rings split by depth, and the star. */}
      <Svg
        width={width}
        height={height}
        viewBox={`${-cx} ${-cy} ${width} ${height}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="nebula-a" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#3B2A7A" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#3B2A7A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebula-b" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#0E5E7A" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#0E5E7A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0.16" stopColor={starColor.core} stopOpacity="0.55" />
            <Stop offset="0.42" stopColor={starColor.mid} stopOpacity="0.22" />
            <Stop offset="1" stopColor={starColor.deep} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Circle cx={-width * 0.22} cy={-height * 0.18} r={width * 0.44} fill="url(#nebula-a)" />
        <Circle cx={width * 0.3} cy={height * 0.16} r={width * 0.38} fill="url(#nebula-b)" />

        {/* Far halves of each orbit go behind the star. */}
        {rings.map((ring) =>
          ring.far ? (
            <Path
              key={`far-${ring.id}`}
              d={ring.far}
              stroke={ring.accent}
              strokeWidth={1}
              strokeOpacity={0.2}
              fill="none"
            />
          ) : null
        )}

        <Circle cx={0} cy={0} r={STAR.radius * 2.4 * starGlow} fill="url(#star-glow)" />
        {core.axons.map((d, index) => (
          <Path
            key={`axon-${index}`}
            d={d}
            stroke={index % 2 === 0 ? starColor.core : starColor.mid}
            strokeWidth={1.1}
            strokeOpacity={0.45}
            fill="none"
          />
        ))}
        {core.points.map((p, index) => (
          <Circle
            key={`node-${index}`}
            cx={p.x}
            cy={p.y}
            r={1.6}
            fill={starColor.core}
            opacity={0.9}
          />
        ))}

        {/* Near halves in front of it. */}
        {rings.map((ring) =>
          ring.near ? (
            <Path
              key={`near-${ring.id}`}
              d={ring.near}
              stroke={ring.accent}
              strokeWidth={1.3}
              strokeOpacity={0.42}
              fill="none"
            />
          ) : null
        )}
      </Svg>

      {/* Everything that moves is an absolutely-positioned view anchored at the
          star, driven entirely on the UI thread. */}
      <View style={[styles.anchor, { left: cx, top: cy }]} pointerEvents="box-none">
        {planets.map((planet) => (
          <OrbitingPlanet
            key={planet.id}
            planet={planet}
            scale={scale}
            clock={clock}
            animate={animate}
            onPress={onSelectPlanet}
          />
        ))}
        {signals.map((signal, index) => (
          <SignalShip
            key={signal.id}
            signal={signal}
            planetsById={planetsById}
            scale={scale}
            clock={clock}
            animate={animate}
            index={index}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  anchor: { position: 'absolute', width: 0, height: 0 },
  body: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 1,
  },
  hit: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tag: {
    position: 'absolute',
    bottom: -2,
    alignItems: 'center',
  },
  tagText: {
    fontSize: 8.5,
    letterSpacing: 1.3,
    textShadowColor: '#000000',
    textShadowRadius: 6,
    ...(Platform.OS === 'web' ? {} : { textShadowOffset: { width: 0, height: 1 } }),
  },
  ship: {
    position: 'absolute',
    width: 54,
    height: 16,
    marginLeft: -27,
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(SolarSystem);
