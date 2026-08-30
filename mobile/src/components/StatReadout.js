import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme';

// A single HUD number. Tabular figures so values do not jitter as they change.
const StatReadout = ({ theme, label, value, unit, tone, align = 'left', compact }) => (
  <View style={[styles.wrap, align === 'center' && styles.center]}>
    <Text
      numberOfLines={1}
      style={[styles.label, typography.hud, { color: theme.colors.text.tertiary }]}
    >
      {label}
    </Text>
    <View style={styles.valueRow}>
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          { color: tone ?? theme.colors.text.primary },
        ]}
      >
        {value}
      </Text>
      {unit ? (
        <Text style={[styles.unit, { color: theme.colors.text.tertiary }]}>{unit}</Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { minWidth: 64 },
  center: { alignItems: 'center' },
  label: { fontSize: 9, marginBottom: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  valueCompact: { fontSize: typography.sizes.base },
  unit: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.semibold,
  },
});

export default StatReadout;
