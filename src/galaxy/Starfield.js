import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Deterministic PRNG so the sky is identical on every launch and on both
// platforms — a random starfield that reshuffles on each render looks broken.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const LAYERS = [
  { count: 70, maxR: 0.7, opacity: 0.45, drift: 10, seed: 1337 },
  { count: 40, maxR: 1.1, opacity: 0.7, drift: 20, seed: 7331 },
  { count: 18, maxR: 1.7, opacity: 0.95, drift: 34, seed: 4242 },
];

const StarLayer = ({ width, height, layer, animate }) => {
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!animate) return undefined;
    drift.value = 0;
    // Slow counter-drift per layer is the parallax: nearer stars sweep further.
    drift.value = withRepeat(
      withTiming(1, { duration: 26000 + layer.drift * 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return undefined;
  }, [animate, drift, layer.drift]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (drift.value - 0.5) * layer.drift },
      { translateY: (drift.value - 0.5) * layer.drift * 0.4 },
    ],
    opacity: 0.75 + drift.value * 0.25,
  }));

  const stars = useMemo(() => {
    const random = mulberry32(layer.seed);
    return Array.from({ length: layer.count }, (_, i) => ({
      key: `${layer.seed}-${i}`,
      cx: random() * (width + 80) - 40,
      cy: random() * (height + 80) - 40,
      r: 0.3 + random() * layer.maxR,
      o: layer.opacity * (0.5 + random() * 0.5),
    }));
  }, [height, layer, width]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width + 80} height={height + 80} style={styles.svg}>
        {stars.map((star) => (
          <Circle
            key={star.key}
            cx={star.cx + 40}
            cy={star.cy + 40}
            r={star.r}
            fill="#FFFFFF"
            opacity={star.o}
          />
        ))}
      </Svg>
    </Animated.View>
  );
};

const Starfield = memo(({ width, height, animate = true }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {LAYERS.map((layer) => (
      <StarLayer
        key={layer.seed}
        width={width}
        height={height}
        layer={layer}
        animate={animate}
      />
    ))}
  </View>
));

const styles = StyleSheet.create({
  svg: { position: 'absolute', left: -40, top: -40 },
});

Starfield.displayName = 'Starfield';

export default Starfield;
