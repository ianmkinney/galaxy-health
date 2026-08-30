import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { motion, panelStyle, radius, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

// The one surface in the app: a frosted hull plate with cut corners and an
// optional accent rail. Every card, HUD readout, and form group is one of these.
const HoloPanel = ({
  theme,
  title,
  meta,
  accent,
  variant = 'panel',
  index,
  style,
  contentStyle,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const surface = panelStyle(theme, variant);

  const entering =
    !reduceMotion && typeof index === 'number'
      ? FadeInDown.duration(motion.duration.enter)
          .delay(Math.min(index, 10) * motion.stagger)
          .springify()
      : undefined;

  return (
    <Animated.View
      entering={entering}
      layout={reduceMotion ? undefined : LinearTransition.springify()}
      style={[
        surface,
        Platform.OS === 'web' ? styles.webBlur : null,
        accent ? { borderColor: accent } : null,
        style,
      ]}
    >
      {accent ? <View style={[styles.rail, { backgroundColor: accent }]} /> : null}
      {title ? (
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              typography.hud,
              { color: accent ?? theme.colors.text.secondary },
            ]}
          >
            {title}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: theme.colors.text.tertiary }]}>{meta}</Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  webBlur: {
    // react-native-web passes unknown style keys straight to CSS.
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: spacing.base,
    bottom: spacing.base,
    width: 3,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.xs,
  },
  meta: {
    fontSize: typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.xs,
  },
});

export default HoloPanel;
