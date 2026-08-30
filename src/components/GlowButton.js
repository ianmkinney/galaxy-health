import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { motion, radius, shadows, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import AnimatedPressable from './AnimatedPressable';

// Primary action: a hard-edged hull button with a live energy sweep across it.
// `tone` is a planet accent colour so buttons inherit the room they're in.
const GlowButton = ({
  theme,
  label,
  icon,
  tone,
  onPress,
  disabled,
  variant = 'solid',
  size = 'base',
  style,
  accessibilityLabel,
}) => {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(-1);

  useEffect(() => {
    if (reduceMotion || disabled || variant !== 'solid') return undefined;
    sweep.value = -1;
    sweep.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
    return undefined;
  }, [disabled, reduceMotion, sweep, variant]);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: 0.32 - Math.abs(sweep.value) * 0.28,
    transform: [{ translateX: sweep.value * 140 }, { rotateZ: '18deg' }],
  }));

  const accent = tone ?? theme.palette.plasma[400];
  const solid = variant === 'solid';
  const compact = size === 'sm';

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      lift={solid ? -2 : 0}
      haptic={solid ? 'medium' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: solid ? accent : 'transparent',
          borderColor: accent,
          opacity: disabled ? 0.4 : 1,
        },
        solid && !disabled ? shadows.glow(accent) : null,
        style,
      ]}
    >
      {solid && !reduceMotion ? (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]} />
      ) : null}
      {icon ? (
        <Ionicons
          name={icon}
          size={compact ? 14 : 17}
          color={solid ? theme.colors.text.inverse : accent}
          style={styles.icon}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          typography.hud,
          compact && styles.labelCompact,
          { color: solid ? theme.colors.text.inverse : accent },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
};

// Round icon-only control for the cockpit console.
export const GlowIconButton = ({ theme, icon, tone, onPress, accessibilityLabel, style }) => {
  const accent = tone ?? theme.palette.plasma[300];
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={motion.scale.pressHard}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconButton,
        { borderColor: accent, backgroundColor: theme.colors.surfaceRaised },
        style,
      ]}
    >
      <Ionicons name={icon} size={19} color={accent} />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  buttonCompact: {
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
  },
  sweep: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 44,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
  },
  labelCompact: {
    fontSize: typography.sizes.xs,
    letterSpacing: 1.2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlowButton;
