import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { motion, radius, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import AnimatedPressable from './AnimatedPressable';

// A single logged entry with a delete affordance. Staggered entry is what makes
// a fresh log feel like it materialised rather than appeared.
const LogRow = ({ theme, accent, title, meta, detail, index = 0, onDelete }) => {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.duration(motion.duration.enter)
              .delay(Math.min(index, 8) * motion.stagger)
              .springify()
      }
      layout={reduceMotion ? undefined : LinearTransition.springify()}
      style={[
        styles.row,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: accent.mid }]} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text.primary }]}>
          {title}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.text.secondary }]}>{meta}</Text>
        {detail ? (
          <Text style={[styles.detail, { color: theme.colors.text.tertiary }]}>{detail}</Text>
        ) : null}
      </View>
      {onDelete ? (
        <AnimatedPressable
          onPress={onDelete}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          style={styles.delete}
        >
          <Ionicons name="close" size={16} color={theme.colors.text.tertiary} />
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  bar: { width: 3, alignSelf: 'stretch', marginRight: spacing.md },
  text: { flex: 1 },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  meta: { fontSize: typography.sizes.sm, marginTop: 1, fontVariant: ['tabular-nums'] },
  detail: { fontSize: typography.sizes.xs, marginTop: 2 },
  delete: { padding: spacing.sm },
});

export default LogRow;
