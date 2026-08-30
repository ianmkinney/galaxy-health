import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getTheme, motion, planetAccents, spacing, typography } from '../theme';
import { signalsRepo } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, on } from '../state/eventBus';
import { SIGNAL_LABEL, describeSignal } from '../state/signalKinds';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';

const accent = planetAccents.lumen;

const stamp = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// The full audit trail. Every row here corresponds to a ship the Bridge either
// is flying now or already delivered.
const SignalLogScreen = () => {
  const theme = getTheme(true);
  const reduceMotion = useReducedMotion();
  const { planetName } = useGalaxy();
  const [signals, setSignals] = useState([]);

  const load = useCallback(async () => {
    setSignals(await signalsRepo.recent(60));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => on(EVENTS.DATA_CHANGED, () => load()), [load]);

  const pending = signals.filter((signal) => !signal.seen).length;

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Comms"
      title="Signal log"
      tagline={
        pending > 0
          ? `${pending} in transit, ${signals.length - pending} delivered.`
          : `${signals.length} transmission${signals.length === 1 ? '' : 's'} on record.`
      }
    >
      <HoloPanel theme={theme} title="Transmissions" accent={accent.mid} index={0}>
        {signals.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.text.tertiary }]}>
            No traffic yet. Log something on any planet and a ship launches.
          </Text>
        ) : (
          signals.map((signal, index) => {
            const source = planetAccents[signal.from] ?? accent;
            return (
              <Animated.View
                key={signal.id}
                entering={
                  reduceMotion
                    ? undefined
                    : FadeInDown.duration(motion.duration.enter)
                        .delay(Math.min(index, 10) * motion.stagger)
                        .springify()
                }
                style={[styles.row, { borderLeftColor: source.mid }]}
              >
                <View style={styles.head}>
                  <Text style={[styles.route, { color: theme.colors.text.primary }]}>
                    {planetName(signal.from)} → {planetName(signal.to)}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: signal.seen
                          ? theme.colors.border
                          : theme.palette.status.info,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        typography.hud,
                        {
                          color: signal.seen
                            ? theme.colors.text.tertiary
                            : theme.palette.status.info,
                        },
                      ]}
                    >
                      {signal.seen ? 'delivered' : 'in transit'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.kind, typography.hud, { color: source.ink }]}>
                  {SIGNAL_LABEL[signal.kind] ?? signal.kind}
                </Text>
                <Text style={[styles.detail, { color: theme.colors.text.secondary }]}>
                  {describeSignal(signal)}
                </Text>
                <Text style={[styles.time, { color: theme.colors.text.tertiary }]}>
                  {stamp(signal.createdAt)}
                  {signal.payloadRef ? ` · ${signal.payloadRef}` : ''}
                </Text>
              </Animated.View>
            );
          })
        )}
      </HoloPanel>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  empty: { fontSize: typography.sizes.sm, fontStyle: 'italic' },
  row: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  badgeText: { fontSize: 8 },
  kind: { fontSize: 9, marginTop: 4 },
  detail: { fontSize: typography.sizes.sm, marginTop: 2 },
  time: { fontSize: 10, marginTop: 4, fontVariant: ['tabular-nums'] },
});

export default SignalLogScreen;
