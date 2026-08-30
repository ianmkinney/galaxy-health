import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { useGalaxy } from '../state/GalaxyContext';
import { signalsRepo } from '../db/repositories';
import { isAiConfigured, MISSING_KEY_MESSAGE } from '../services/aiSettings';
import { synthesizeDay } from '../services/synthesisService';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import GlowButton from '../components/GlowButton';

const accent = planetAccents.observatory;

const SynthesisScreen = ({ navigation }) => {
  const theme = getTheme(true);
  const { totals, planets, inFlight, planetName } = useGalaxy();

  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      isAiConfigured().then((ok) => {
        if (alive) setConfigured(ok);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const recentSignals = await signalsRepo.recent(20);
      const synthesis = await synthesizeDay({
        totals,
        planets,
        inFlight,
        recentSignals,
      });
      setResult(synthesis);
    } catch (err) {
      setError(err?.message || 'Synthesis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Cross-planet"
      title="Synthesis"
      tagline={`Read today's ${planetName('galley')} → ${planetName('atlas')} → ${planetName('lumen')} traffic with your own key.`}
    >
      <HoloPanel theme={theme} title="Optional AI" accent={accent.mid} index={0}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Core logging never needs a key. Synthesis is the one place AI earns its keep —
          connecting fuel, load, recovery, and assay counts that local math cannot narrate.
        </Text>
        <Text style={[styles.body, { color: theme.colors.text.tertiary, marginTop: spacing.sm }]}>
          Raw lab values stay on device. Only day aggregates and signal summaries are sent to
          the provider you configured.
        </Text>
        {!configured ? (
          <GlowButton
            theme={theme}
            tone={accent.mid}
            size="sm"
            label="Open Account to add a key"
            icon="key"
            onPress={() => navigation.navigate('Account')}
            style={styles.action}
          />
        ) : (
          <GlowButton
            theme={theme}
            tone={accent.mid}
            size="sm"
            label={loading ? 'Reading the system…' : 'Synthesize today'}
            icon="planet"
            disabled={loading}
            onPress={run}
            style={styles.action}
          />
        )}
      </HoloPanel>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={accent.mid} />
        </View>
      ) : null}

      {error ? (
        <HoloPanel theme={theme} title="Signal lost" accent={theme.palette.status.bad} index={1}>
          <Text style={[styles.body, { color: theme.colors.text.secondary }]}>{error}</Text>
          {error === MISSING_KEY_MESSAGE || error.includes('Account') ? (
            <GlowButton
              theme={theme}
              tone={accent.mid}
              variant="ghost"
              size="sm"
              label="Account"
              onPress={() => navigation.navigate('Account')}
              style={styles.action}
            />
          ) : null}
        </HoloPanel>
      ) : null}

      {result ? (
        <HoloPanel theme={theme} title="Briefing" accent={accent.mid} index={2}>
          <Text style={[styles.result, { color: theme.colors.text.primary }]}>{result.text}</Text>
          <Text style={[styles.disclaimer, { color: theme.colors.text.tertiary }]}>
            {result.disclaimer}
          </Text>
        </HoloPanel>
      ) : null}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  action: { marginTop: spacing.md, alignSelf: 'flex-start' },
  loading: { paddingVertical: spacing.lg, alignItems: 'center' },
  result: { fontSize: typography.sizes.sm, lineHeight: 22 },
  disclaimer: { fontSize: typography.sizes.xs, lineHeight: 18, marginTop: spacing.md },
});

export default SynthesisScreen;
