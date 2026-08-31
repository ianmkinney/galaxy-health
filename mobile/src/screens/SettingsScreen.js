import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTheme, planetAccents, accentForPlanet, spacing, typography } from '../theme';
import { schemaVersion } from '../db/client';
import { useGalaxy } from '../state/GalaxyContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import GlowButton from '../components/GlowButton';
import ForgePlanetPanel from '../components/ForgePlanetPanel';
import AnimatedPressable from '../components/AnimatedPressable';
import { Field } from '../components/Field';
import {
  getAccountAiState,
  getProviderMeta,
  setSelectedModel,
} from '../services/aiSettings';
import { fallbackModels, listProviderModels } from '../services/aiClient';

const accent = planetAccents.lumen;

function legalOrigin(uplinkUrl) {
  const raw = String(uplinkUrl || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

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
  const {
    planets,
    renamePlanet,
    setPlanetEnabled,
    restoreCoreWorlds,
    unmakePlanet,
    isCorePlanet,
    purge,
    settings,
    updateSetting,
  } = useGalaxy();

  const [drafts, setDrafts] = useState({});
  const [aiHasKey, setAiHasKey] = useState(false);
  const [aiProvider, setAiProvider] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiModels, setAiModels] = useState([]);
  const [aiListing, setAiListing] = useState(false);
  const [aiModelsError, setAiModelsError] = useState('');

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

  const loadAi = useCallback(async (force = false) => {
    try {
      const state = await getAccountAiState();
      setAiHasKey(state.hasKey);
      setAiProvider(state.provider);
      setAiModel(state.model);
      setAiModels(state.cachedModels || []);
      setAiModelsError('');
      if (state.hasKey) {
        setAiListing(true);
        try {
          const result = await listProviderModels({
            provider: state.provider,
            force: force || !state.cachedModels?.length,
          });
          setAiModels(result.models);
          const stillValid = result.models.some((item) => item.id === state.model);
          if (!stillValid && result.models[0]) {
            await setSelectedModel(state.provider, result.models[0].id);
            setAiModel(result.models[0].id);
          }
        } catch (error) {
          setAiModels(fallbackModels(state.provider));
          setAiModelsError(error.message || 'Could not list models');
        } finally {
          setAiListing(false);
        }
      } else {
        setAiModels([]);
      }
    } catch {
      setAiHasKey(false);
      setAiModels([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAi();
    }, [loadAi])
  );

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
      tagline="Add or remove worlds, rename planets, manage local data."
    >
      <ForgePlanetPanel theme={theme} accent={accent} navigation={navigation} index={0} />

      <HoloPanel theme={theme} title="Planet registry" accent={accent.mid} index={1}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Remove a core world to hide it from the canopy — restore it later. Unmake a custom world
          to delete its systems and logs.
        </Text>
        {planets.map((planet) => {
          const planetAccent = accentForPlanet(planet);
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
                    id: {planet.id}
                    {planet.custom ? ' · custom' : ' · core'}
                    {planet.enabled ? '' : ' · off canopy'}
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
              {planet.enabled ? (
                <GlowButton
                  theme={theme}
                  tone={theme.palette.status.bad}
                  variant="ghost"
                  size="sm"
                  label={planet.custom ? 'Unmake' : 'Remove'}
                  onPress={() =>
                    confirm(
                      planet.custom ? `Unmake ${planet.name}?` : `Remove ${planet.name}?`,
                      planet.custom
                        ? 'Systems and logs on this world are deleted.'
                        : 'Hides this world from the canopy. You can restore core worlds later.',
                      () => unmakePlanet(planet.id)
                    )
                  }
                  style={styles.action}
                />
              ) : isCorePlanet(planet.id) ? (
                <GlowButton
                  theme={theme}
                  tone={accent.mid}
                  variant="ghost"
                  size="sm"
                  label="Restore"
                  onPress={() => setPlanetEnabled(planet.id, true)}
                  style={styles.action}
                />
              ) : null}
            </View>
          );
        })}
        <GlowButton
          theme={theme}
          tone={accent.mid}
          variant="ghost"
          size="sm"
          label="Restore core worlds"
          icon="refresh"
          onPress={() =>
            confirm(
              'Restore core worlds?',
              'Galley, Atlas, Lumen, Observatory return to the canopy with default names.',
              restoreCoreWorlds
            )
          }
          style={styles.action}
        />
      </HoloPanel>

      <HoloPanel theme={theme} title="Credentials" accent={accent.mid} index={2}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Bring your own key for optional cross-planet synthesis. Keys stay in the OS keychain;
          core logging never needs one. After a key is saved, every chat model for that provider
          is listed here.
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
        <Text style={[styles.modelHeading, typography.hud, { color: accent.ink }]}>
          Models{aiListing ? ' · listing' : aiModels.length ? ` · ${aiModels.length}` : ''}
        </Text>
        {!aiHasKey ? (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Save a key in Account to list live models.
          </Text>
        ) : (
          <>
            <GlowButton
              theme={theme}
              tone={accent.mid}
              variant="ghost"
              size="sm"
              label={aiListing ? 'Refreshing…' : 'Refresh models'}
              icon="refresh"
              disabled={aiListing}
              onPress={() => loadAi(true)}
              style={styles.action}
            />
            {aiModelsError ? (
              <Text style={[styles.error, { color: theme.palette.status.warn }]}>{aiModelsError}</Text>
            ) : null}
            <View style={styles.modelList}>
              {(aiModels.length ? aiModels : fallbackModels(aiProvider)).map((item) => {
                const selected = item.id === aiModel;
                return (
                  <AnimatedPressable
                    key={item.id}
                    onPress={async () => {
                      await setSelectedModel(aiProvider, item.id);
                      setAiModel(item.id);
                    }}
                    lift={-1}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.modelRow,
                      {
                        borderColor: selected ? accent.mid : theme.colors.border,
                        backgroundColor: selected ? theme.colors.surfaceRaised : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.modelId,
                        { color: selected ? accent.ink : theme.colors.text.primary },
                      ]}
                    >
                      {item.name || item.id}
                    </Text>
                    {selected ? (
                      <Text style={[styles.selected, { color: accent.mid }]}>ACTIVE</Text>
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
            {aiProvider ? (
              <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
                {getProviderMeta(aiProvider).shortLabel} · tap a row to set the active model.
              </Text>
            ) : null}
          </>
        )}
      </HoloPanel>

      <HoloPanel theme={theme} title="First Mate" accent="#7AF0FF" index={3}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          First Mate is the lattice at the centre. Tap it on the Bridge to log by chat. Optional
          uplink posts the same text to the web First Mate API so Drive stays in sync.
        </Text>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          First Mate SMS (web/Twilio) is conversational health-log replies — meals, workouts, sleep,
          labs. Message frequency varies (typically 1–8 messages per week). Message and data rates
          may apply. Reply HELP for help, STOP to cancel. Consent is never pre-checked; complete
          opt-in on the web form or by texting START, then YES.
        </Text>
        <Field
          theme={theme}
          label="Your phone (SMS From)"
          value={settings.first_mate_phone ?? ''}
          onChangeText={(value) => updateSetting('first_mate_phone', value)}
          placeholder="+1 555 0100"
          autoCapitalize="none"
          keyboardType="phone-pad"
        />
        <Field
          theme={theme}
          label="Uplink URL"
          value={settings.first_mate_uplink_url ?? ''}
          onChangeText={(value) => updateSetting('first_mate_uplink_url', value)}
          placeholder="https://your-app.vercel.app/api/first-mate"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          theme={theme}
          label="Uplink token"
          value={settings.first_mate_uplink_token ?? ''}
          onChangeText={(value) => updateSetting('first_mate_uplink_token', value)}
          placeholder="gh1.…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        {legalOrigin(settings.first_mate_uplink_url) ? (
          <View style={styles.linkRow}>
            <GlowButton
              theme={theme}
              tone="#7AF0FF"
              size="sm"
              variant="ghost"
              label="SMS opt-in"
              onPress={() =>
                Linking.openURL(`${legalOrigin(settings.first_mate_uplink_url)}/sms`)
              }
              style={styles.action}
            />
            <GlowButton
              theme={theme}
              tone="#7AF0FF"
              size="sm"
              variant="ghost"
              label="Privacy"
              onPress={() =>
                Linking.openURL(`${legalOrigin(settings.first_mate_uplink_url)}/privacy`)
              }
              style={styles.action}
            />
            <GlowButton
              theme={theme}
              tone="#7AF0FF"
              size="sm"
              variant="ghost"
              label="Terms"
              onPress={() =>
                Linking.openURL(`${legalOrigin(settings.first_mate_uplink_url)}/terms`)
              }
              style={styles.action}
            />
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Paste the web uplink URL to open SMS opt-in, Privacy, and Terms in the browser.
          </Text>
        )}
        <GlowButton
          theme={theme}
          tone="#7AF0FF"
          size="sm"
          label="Open First Mate"
          icon="pulse"
          onPress={() => navigation.navigate('FirstMate')}
          style={styles.action}
        />
      </HoloPanel>

      <HoloPanel theme={theme} title="Motion" accent={accent.mid} index={4}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          {reduceMotion
            ? 'Reduce Motion is on in your OS settings, so orbits are parked, warp is a fade, and nothing loops.'
            : 'Full motion: orbits, drifting starfield, warp jump, and press physics are active. Turn on Reduce Motion in your OS accessibility settings for the calm version.'}
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="Local data" accent={accent.mid} index={5}>
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
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  modelHeading: { fontSize: 10, marginTop: spacing.lg },
  hint: { fontSize: typography.sizes.xs, marginTop: spacing.sm, lineHeight: 18 },
  error: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  modelList: { marginTop: spacing.md, gap: spacing.sm },
  modelRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelId: { flex: 1, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  selected: { fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginLeft: spacing.sm },
});

export default SettingsScreen;
