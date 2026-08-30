import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { schemaVersion } from '../db/client';
import { useGalaxy } from '../state/GalaxyContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import GlowButton from '../components/GlowButton';
import { Field } from '../components/Field';

const accent = planetAccents.lumen;

// Cross-platform confirm: Alert has no web implementation with buttons.
const confirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: onConfirm },
  ]);
};

const SettingsScreen = ({ navigation }) => {
  const theme = getTheme(true);
  const reduceMotion = useReducedMotion();
  const { planets, renamePlanet, setPlanetEnabled, resetPlanetNames, purge } = useGalaxy();

  const [drafts, setDrafts] = useState({});

  // Keep the inputs in sync with storage but never fight the user mid-typing.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      planets.forEach((planet) => {
        if (next[planet.id] === undefined) next[planet.id] = planet.name;
      });
      return next;
    });
  }, [planets]);

  const commit = useCallback(
    async (planet) => {
      const draft = (drafts[planet.id] ?? '').trim();
      if (!draft || draft === planet.name) {
        setDrafts((prev) => ({ ...prev, [planet.id]: planet.name }));
        return;
      }
      await renamePlanet(planet.id, draft);
    },
    [drafts, renamePlanet]
  );

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Ship systems"
      title="Settings"
      tagline="Rename planets, toggle what appears in the canopy, manage local data."
    >
      <HoloPanel theme={theme} title="Planet registry" accent={accent.mid} index={0}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Names are yours. Internal ids stay fixed, so renaming never touches stored data or
          migrations.
        </Text>
        {planets.map((planet) => {
          const planetAccent = planetAccents[planet.id];
          return (
            <View
              key={planet.id}
              style={[styles.planetRow, { borderColor: theme.colors.border }]}
            >
              <View style={styles.planetHead}>
                <View style={[styles.orb, { backgroundColor: planetAccent.mid }]} />
                <View style={styles.planetMeta}>
                  <Text style={[styles.planetDomain, { color: planetAccent.ink }]}>
                    {planet.domain}
                  </Text>
                  <Text style={[styles.planetId, { color: theme.colors.text.tertiary }]}>
                    id: {planet.id} · default: {planet.defaultName}
                  </Text>
                </View>
                <Switch
                  value={planet.enabled}
                  onValueChange={(value) => setPlanetEnabled(planet.id, value)}
                  trackColor={{ true: planetAccent.mid, false: theme.colors.border }}
                  thumbColor={theme.colors.text.primary}
                  accessibilityLabel={`Show ${planet.name} in the system`}
                />
              </View>
              <Field
                theme={theme}
                label="Display name"
                value={drafts[planet.id] ?? ''}
                onChangeText={(value) => setDrafts((prev) => ({ ...prev, [planet.id]: value }))}
                onBlur={() => commit(planet)}
                onSubmitEditing={() => commit(planet)}
                placeholder={planet.defaultName}
                returnKeyType="done"
                maxLength={24}
              />
            </View>
          );
        })}
        <GlowButton
          theme={theme}
          tone={accent.mid}
          variant="ghost"
          size="sm"
          label="Restore default names"
          icon="refresh"
          onPress={() =>
            confirm('Restore default names?', 'Galley, Atlas, Lumen, Observatory.', resetPlanetNames)
          }
          style={styles.action}
        />
      </HoloPanel>

      <HoloPanel theme={theme} title="Credentials" accent={accent.mid} index={1}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Bring your own key for optional cross-planet synthesis. Keys stay in the OS keychain;
          core logging never needs one.
        </Text>
        <GlowButton
          theme={theme}
          tone={accent.mid}
          variant="ghost"
          size="sm"
          label="Account & API keys"
          icon="key"
          onPress={() => navigation.navigate('Account')}
          style={styles.action}
        />
      </HoloPanel>

      <HoloPanel theme={theme} title="Motion" accent={accent.mid} index={2}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          {reduceMotion
            ? 'Reduce Motion is on in your OS settings, so orbits are parked, warp is a fade, and nothing loops.'
            : 'Full motion: orbits, drifting starfield, warp jump, and press physics are active. Turn on Reduce Motion in your OS accessibility settings for the calm version.'}
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="Local data" accent={accent.mid} index={3}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Everything lives in an on-device SQLite database (schema v{schemaVersion()}). No Galaxy
          Health server. Optional AI uses only your own provider key.
        </Text>
        <GlowButton
          theme={theme}
          tone={theme.palette.status.bad}
          variant="ghost"
          size="sm"
          label="Purge all logs & signals"
          icon="trash"
          onPress={() =>
            confirm(
              'Purge local data?',
              'Deletes every meal, session, check-in, assay, and signal. Planet names are kept.',
              purge
            )
          }
          style={styles.action}
        />
      </HoloPanel>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  planetRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.base,
  },
  planetHead: { flexDirection: 'row', alignItems: 'center' },
  orb: { width: 14, height: 14, borderRadius: 7, marginRight: spacing.md },
  planetMeta: { flex: 1 },
  planetDomain: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  planetId: { fontSize: 10, marginTop: 1 },
  action: { marginTop: spacing.base, alignSelf: 'flex-start' },
});

export default SettingsScreen;
