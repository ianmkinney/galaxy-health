import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { motion, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

const STREAKS = 26;

// Radial streaks pre-computed once; the animation only scales and fades them.
const streaks = Array.from({ length: STREAKS }, (_, i) => {
  const angle = (i / STREAKS) * Math.PI * 2 + 0.21;
  return {
    key: i,
    x1: Math.cos(angle) * 40,
    y1: Math.sin(angle) * 40,
    x2: Math.cos(angle) * 460,
    y2: Math.sin(angle) * 460,
  };
});

// Full-screen jump to lightspeed. Runs when the user selects a planet, then
// hands control back via `onComplete` so navigation happens at peak white.
const WarpOverlay = ({ target, accent = '#6FDBFF', onComplete }) => {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const flash = useSharedValue(0);
  const active = Boolean(target);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      flash.value = 0;
      return;
    }

    const finish = () => onComplete?.(target);

    if (reduceMotion) {
      // Calm fallback: a short fade, no streaks, no zoom.
      flash.value = withTiming(0.55, { duration: motion.duration.fast }, (done) => {
        if (done) runOnJS(finish)();
      });
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: motion.duration.warp,
      easing: Easing.in(Easing.cubic),
    });
    flash.value = withSequence(
      withTiming(0.9, { duration: motion.duration.warp * 0.8, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: motion.duration.warp * 0.2 }, (done) => {
        if (done) runOnJS(finish)();
      })
    );
  }, [active, flash, onComplete, progress, reduceMotion, target]);

  const streakStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.95,
    transform: [{ scale: 0.3 + progress.value * 2.6 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.7 ? progress.value * 1.2 : (1 - progress.value) * 4,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {!reduceMotion ? (
        <Animated.View style={[styles.center, streakStyle]}>
          <Svg width={width} height={height} viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}>
            <Defs>
              <LinearGradient id="warp-streak" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={accent} stopOpacity="0" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            {streaks.map((streak) => (
              <Line
                key={streak.key}
                x1={streak.x1}
                y1={streak.y1}
                x2={streak.x2}
                y2={streak.y2}
                stroke="url(#warp-streak)"
                strokeWidth={2}
              />
            ))}
          </Svg>
        </Animated.View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      <Animated.View style={[styles.label, labelStyle]} pointerEvents="none">
        <Text style={[styles.labelText, typography.hud]}>Engaging warp</Text>
        <Text style={[styles.targetText, typography.hud, { color: accent }]}>
          {target?.name ?? ''}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  flash: { backgroundColor: '#05070F' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '22%',
    alignItems: 'center',
  },
  labelText: { color: '#B4C4E4', fontSize: 11, letterSpacing: 3 },
  targetText: { fontSize: 22, letterSpacing: 4, marginTop: 6 },
});

export default WarpOverlay;
