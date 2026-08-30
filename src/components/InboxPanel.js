import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { motion, planetAccents, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SIGNAL_LABEL, describeSignal } from '../state/signalKinds';
import HoloPanel from './HoloPanel';

const timeAgo = (ts) => {
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

// What other planets have sent here. These rows are the receiving half of the
// ships the user watched fly on the Bridge.
const InboxPanel = ({ theme, accent, signals, planetName, index, emptyHint }) => {
  const reduceMotion = useReducedMotion();

  return (
    <HoloPanel
      theme={theme}
      title="Inbound transmissions"
      meta={signals.length > 0 ? `${signals.length} received` : undefined}
      accent={accent.mid}
      index={index}
    >
      {signals.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.text.tertiary }]}>
          {emptyHint ?? 'Nothing inbound yet.'}
        </Text>
      ) : (
        signals.map((signal, i) => {
          const sourceAccent = planetAccents[signal.from] ?? accent;
          return (
            <Animated.View
              key={signal.id}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInRight.duration(motion.duration.enter)
                      .delay(Math.min(i, 8) * motion.stagger)
                      .springify()
              }
              style={[styles.row, { borderLeftColor: sourceAccent.mid }]}
            >
              <View style={styles.rowHead}>
                <Text style={[styles.from, { color: sourceAccent.ink }]}>
                  {planetName(signal.from)}
                </Text>
                <Text style={[styles.time, { color: theme.colors.text.tertiary }]}>
                  {timeAgo(signal.createdAt)}
                </Text>
              </View>
              <Text style={[styles.kind, typography.hud, { color: theme.colors.text.tertiary }]}>
                {SIGNAL_LABEL[signal.kind] ?? 'Signal'}
              </Text>
              <Text style={[styles.detail, { color: theme.colors.text.secondary }]}>
                {describeSignal(signal)}
              </Text>
            </Animated.View>
          );
        })
      )}
    </HoloPanel>
  );
};

const styles = StyleSheet.create({
  empty: { fontSize: typography.sizes.sm, fontStyle: 'italic', paddingVertical: spacing.xs },
  row: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  from: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  time: { fontSize: 10 },
  kind: { fontSize: 9, marginTop: 2 },
  detail: { fontSize: typography.sizes.sm, marginTop: 2 },
});

export default InboxPanel;
