import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, spacing, typography } from '../theme';
import AnimatedPressable from './AnimatedPressable';

export const Field = ({ theme, label, style, unit, ...rest }) => (
  <View style={[styles.field, style]}>
    <Text style={[styles.label, typography.hud, { color: theme.colors.text.tertiary }]}>
      {label}
    </Text>
    <View
      style={[
        styles.inputWrap,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken },
      ]}
    >
      <TextInput
        placeholderTextColor={theme.colors.text.tertiary}
        style={[styles.input, { color: theme.colors.text.primary }]}
        {...rest}
      />
      {unit ? (
        <Text style={[styles.unit, { color: theme.colors.text.tertiary }]}>{unit}</Text>
      ) : null}
    </View>
  </View>
);

// Horizontal choice chips — used for meal slot, workout modality, etc.
export const ChipRow = ({ theme, accent, options, value, onChange, label }) => (
  <View style={styles.field}>
    {label ? (
      <Text style={[styles.label, typography.hud, { color: theme.colors.text.tertiary }]}>
        {label}
      </Text>
    ) : null}
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            onPress={() => onChange(option.value)}
            scaleTo={0.94}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                borderColor: selected ? accent.mid : theme.colors.border,
                backgroundColor: selected ? accent.glow : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? accent.ink : theme.colors.text.secondary },
              ]}
            >
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  </View>
);

// 1..5 scale. Deliberately chunky so it is usable one-handed.
export const ScaleRow = ({ theme, accent, label, value, onChange, max = 5 }) => (
  <View style={styles.field}>
    <Text style={[styles.label, typography.hud, { color: theme.colors.text.tertiary }]}>
      {label}
    </Text>
    <View style={styles.chips}>
      {Array.from({ length: max }, (_, i) => i + 1).map((step) => {
        const active = step <= value;
        return (
          <AnimatedPressable
            key={step}
            onPress={() => onChange(step)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${step} of ${max}`}
            style={[
              styles.pip,
              {
                borderColor: active ? accent.mid : theme.colors.border,
                backgroundColor: active ? accent.mid : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.pipText,
                { color: active ? theme.colors.text.inverse : theme.colors.text.tertiary },
              ]}
            >
              {step}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  field: { marginTop: spacing.md },
  label: { fontSize: 9.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  unit: { fontSize: typography.sizes.xs, marginLeft: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.base,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  pip: {
    width: 44,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
});

export default Field;
