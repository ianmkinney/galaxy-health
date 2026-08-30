import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import GlowButton from '../components/GlowButton';
import AnimatedPressable from '../components/AnimatedPressable';
import {
  USER_SAFETY_DETAILS,
  USER_SAFETY_SUMMARY,
  USER_SAFETY_TITLE,
} from '../constants/userSafety';
import {
  PROVIDERS,
  DEFAULT_MODELS,
  clearApiKey,
  getAccountAiState,
  getProviderMeta,
  saveApiKey,
  setSelectedModel,
  setSelectedProvider,
} from '../services/aiSettings';
import { fallbackModels, listProviderModels } from '../services/aiClient';

const accent = planetAccents.lumen;

const AccountScreen = () => {
  const theme = getTheme(true);

  const [provider, setProvider] = useState(PROVIDERS[0].id);
  const [hasKey, setHasKey] = useState(false);
  const [keyLast4, setKeyLast4] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODELS[PROVIDERS[0].id]);
  const [models, setModels] = useState([]);
  const [modelsFromCache, setModelsFromCache] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState(false);
  const [status, setStatus] = useState('');
  const [showSafety, setShowSafety] = useState(false);

  const applyState = useCallback((state) => {
    setProvider(state.provider);
    setHasKey(state.hasKey);
    setKeyLast4(state.keyLast4);
    setModel(state.model);
    setModels(state.cachedModels || []);
    setModelsFromCache(Boolean(state.cachedModels?.length));
  }, []);

  const refreshModels = useCallback(
    async (providerId, { force = true, currentModel } = {}) => {
      setListing(true);
      setModelsError('');
      try {
        const result = await listProviderModels({ provider: providerId, force });
        setModels(result.models);
        setModelsFromCache(result.fromCache);
        const selected = currentModel || model;
        const stillValid = result.models.some((item) => item.id === selected);
        if (!stillValid && result.models[0]) {
          await setSelectedModel(providerId, result.models[0].id);
          setModel(result.models[0].id);
        }
      } catch (error) {
        setModels(fallbackModels(providerId));
        setModelsError(error.message || 'Could not list models');
      } finally {
        setListing(false);
      }
    },
    [model]
  );

  const load = useCallback(async () => {
    try {
      const state = await getAccountAiState();
      applyState(state);
      setModelsError('');
      if (state.hasKey && !state.cachedModels?.length) {
        refreshModels(state.provider, { force: false, currentModel: state.model });
      }
    } catch (error) {
      setStatus(error.message || 'Could not load AI settings');
    } finally {
      setLoadingState(false);
    }
  }, [applyState, refreshModels]);

  useEffect(() => {
    load();
  }, [load]);

  const onSelectProvider = async (next) => {
    setStatus('');
    setProvider(next);
    setKeyDraft('');
    setShowKey(false);
    await setSelectedProvider(next);
    const state = await getAccountAiState();
    applyState(state);
    if (state.hasKey) {
      refreshModels(next, { force: !state.cachedModels?.length, currentModel: state.model });
    } else {
      setModels([]);
      setModelsFromCache(false);
    }
  };

  const onSaveKey = async () => {
    setSaving(true);
    setStatus('');
    try {
      await saveApiKey(provider, keyDraft);
      setKeyDraft('');
      setShowKey(false);
      setHasKey(true);
      const state = await getAccountAiState();
      applyState(state);
      setStatus('Key saved on this device.');
      await refreshModels(provider, { force: true, currentModel: state.model });
    } catch (error) {
      setStatus(error.message || 'Could not save key');
    } finally {
      setSaving(false);
    }
  };

  const onClearKey = async () => {
    setSaving(true);
    setStatus('');
    try {
      await clearApiKey(provider);
      setHasKey(false);
      setKeyLast4('');
      setKeyDraft('');
      setModels([]);
      setModelsFromCache(false);
      setStatus('Key removed from this device.');
    } catch (error) {
      setStatus(error.message || 'Could not clear key');
    } finally {
      setSaving(false);
    }
  };

  const onPickModel = async (modelId) => {
    await setSelectedModel(provider, modelId);
    setModel(modelId);
    setStatus(`Model set to ${modelId}`);
  };

  const meta = getProviderMeta(provider);

  if (loadingState) {
    return (
      <ScreenShell
        theme={theme}
        accent={accent}
        subtitle="Credentials"
        title="Account"
        tagline="Bring your own key. Stored on device only."
      >
        <ActivityIndicator color={accent.mid} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Credentials"
      title="Account"
      tagline="Bring your own key. Stored on device only."
    >
      <HoloPanel theme={theme} title={USER_SAFETY_TITLE} accent={accent.mid} index={0}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          {USER_SAFETY_SUMMARY}
        </Text>
        <GlowButton
          theme={theme}
          tone={accent.mid}
          variant="ghost"
          size="sm"
          label={showSafety ? 'Hide details' : 'How storage works'}
          icon={showSafety ? 'chevron-up' : 'chevron-down'}
          onPress={() => setShowSafety((v) => !v)}
          style={styles.action}
        />
        {showSafety ? (
          <Text style={[styles.safety, { color: theme.colors.text.tertiary }]}>
            {USER_SAFETY_DETAILS}
          </Text>
        ) : null}
      </HoloPanel>

      <HoloPanel theme={theme} title="Provider" accent={accent.mid} index={1}>
        <View style={styles.providerRow}>
          {PROVIDERS.map((item) => {
            const selected = item.id === provider;
            return (
              <AnimatedPressable
                key={item.id}
                onPress={() => onSelectProvider(item.id)}
                lift={-1}
                haptic="light"
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Use ${item.label}`}
                style={[
                  styles.providerChip,
                  {
                    borderColor: selected ? accent.mid : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.surfaceRaised
                      : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.providerLabel,
                    { color: selected ? accent.ink : theme.colors.text.secondary },
                  ]}
                >
                  {item.shortLabel}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          Get a key from {meta.label}.{' '}
          <Text
            style={{ color: accent.mid }}
            onPress={() => Linking.openURL(meta.docsUrl)}
          >
            Open docs
          </Text>
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="API key" accent={accent.mid} index={2}>
        {hasKey ? (
          <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
            Saved on device: {keyLast4}
          </Text>
        ) : (
          <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
            No key for {meta.shortLabel} yet. Core logging still works offline.
          </Text>
        )}
        <TextInput
          value={keyDraft}
          onChangeText={setKeyDraft}
          placeholder={meta.hint}
          placeholderTextColor={theme.colors.text.tertiary}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceRaised,
            },
          ]}
        />
        <View style={styles.rowActions}>
          <GlowButton
            theme={theme}
            tone={accent.mid}
            variant="ghost"
            size="sm"
            label={showKey ? 'Hide' : 'Show'}
            onPress={() => setShowKey((v) => !v)}
          />
          <GlowButton
            theme={theme}
            tone={accent.mid}
            size="sm"
            label={saving ? 'Saving…' : 'Save key'}
            icon="save"
            disabled={saving || !keyDraft.trim()}
            onPress={onSaveKey}
          />
          {hasKey ? (
            <GlowButton
              theme={theme}
              tone={theme.palette.status.bad}
              variant="ghost"
              size="sm"
              label="Clear"
              icon="trash"
              disabled={saving}
              onPress={onClearKey}
            />
          ) : null}
        </View>
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Model"
        meta={modelsFromCache ? 'cached' : listing ? 'listing…' : undefined}
        accent={accent.mid}
        index={3}
      >
        {!hasKey ? (
          <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
            Save a key to list live models from {meta.shortLabel}.
          </Text>
        ) : (
          <>
            <View style={styles.rowActions}>
              <GlowButton
                theme={theme}
                tone={accent.mid}
                variant="ghost"
                size="sm"
                label={listing ? 'Refreshing…' : 'Refresh models'}
                icon="refresh"
                disabled={listing}
                onPress={() => refreshModels(provider, { force: true, currentModel: model })}
              />
            </View>
            {modelsError ? (
              <Text style={[styles.error, { color: theme.palette.status.warn }]}>
                {modelsError}
              </Text>
            ) : null}
            <View style={styles.modelList}>
              {(models.length ? models : fallbackModels(provider)).map((item) => {
                const selected = item.id === model;
                return (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => onPickModel(item.id)}
                    lift={-1}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.modelRow,
                      {
                        borderColor: selected ? accent.mid : theme.colors.border,
                        backgroundColor: selected
                          ? theme.colors.surfaceRaised
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modelId,
                        { color: selected ? accent.ink : theme.colors.text.primary },
                      ]}
                      numberOfLines={1}
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
          </>
        )}
      </HoloPanel>

      {status ? (
        <Text style={[styles.status, { color: theme.colors.text.secondary }]}>{status}</Text>
      ) : null}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  safety: { fontSize: typography.sizes.xs, lineHeight: 18, marginTop: spacing.md },
  hint: { fontSize: typography.sizes.xs, marginTop: spacing.md, lineHeight: 18 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  providerLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: { marginTop: spacing.md, alignSelf: 'flex-start' },
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
  error: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  status: { fontSize: typography.sizes.sm, marginTop: spacing.sm },
});

export default AccountScreen;
