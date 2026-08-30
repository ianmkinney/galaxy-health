import React, { useCallback } from 'react';
import { Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

const Base = Animated.createAnimatedComponent(Pressable);

// Haptics only exists on device; calling it on web throws.
const tap = (style) => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
};

const AnimatedPressable = ({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = motion.scale.press,
  lift = 0,
  tilt = false,
  haptic = 'light',
  disabled,
  ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  const handlePressIn = useCallback(
    (event) => {
      if (!disabled && !reduceMotion) {
        scale.value = withSpring(scaleTo, motion.spring.press);
        if (lift) translateY.value = withSpring(lift, motion.spring.press);
        if (tilt) rotate.value = withSpring(-1.4, motion.spring.press);
      }
      onPressIn?.(event);
    },
    [disabled, lift, onPressIn, reduceMotion, rotate, scale, scaleTo, tilt, translateY]
  );

  const handlePressOut = useCallback(
    (event) => {
      if (!reduceMotion) {
        // Overshoot on release is what makes the button feel physical.
        scale.value = withSpring(1, motion.spring.pop);
        translateY.value = withSpring(0, motion.spring.pop);
        rotate.value = withSpring(0, motion.spring.pop);
      }
      onPressOut?.(event);
    },
    [onPressOut, reduceMotion, rotate, scale, translateY]
  );

  const handlePress = useCallback(
    (event) => {
      if (haptic) {
        tap(
          haptic === 'heavy'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : haptic === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light
        );
      }
      onPress?.(event);
    },
    [haptic, onPress]
  );

  return (
    <Base
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </Base>
  );
};

export default AnimatedPressable;
