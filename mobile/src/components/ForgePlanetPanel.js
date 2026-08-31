import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme';
import { useGalaxy } from '../state/GalaxyContext';
import HoloPanel from './HoloPanel';
import GlowButton from './GlowButton';
import { Field } from './Field';
import {
  emptyPlanetTemplate,
  heuristicPlanet,
  parseForgePlanet,
  planetForgePrompt,
} from '../galaxy/worldForge';
import { generateText } from '../services/aiClient';

const ForgePlanetPanel = ({ theme, accent, navigation, index = 0 }) => {
  const { forgePlanet } = useGalaxy();
  const [brief, setBrief] = useState('');
  const [draft, setDraft] = useState(() => emptyPlanetTemplate());
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const fillFromContext = async (description) => {
    let next = heuristicPlanet(description);
    let via = 'local';
    try {
      const text = await generateText(planetForgePrompt(description));
      next = parseForgePlanet(text, description);
      via = 'ai';
    } catch {
      via = 'local';
    }
    return { next, via };
  };

  const fillTemplate = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError('');
    try {
      const { next, via } = await fillFromContext(description);
      setDraft(next);
      setFilled(true);
      setNotice(
        via === 'ai'
          ? `Template filled: ${next.systems.length} tracking systems from your context.`
          : 'Template filled locally from your context. Add an API key in Account for a richer AI fill.'
      );
    } finally {
      setBusy(false);
    }
  };

  const raise = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError('');
    try {
      let ready = draft;
      if (!filled) {
        const filledDraft = await fillFromContext(description);
        ready = filledDraft.next;
        setDraft(ready);
        setFilled(true);
      }
      const id = await forgePlanet(ready, description);
      setNotice(`${ready.name} is in orbit with ${ready.systems.length} buildings.`);
      setBrief('');
      setDraft(emptyPlanetTemplate());
      setFilled(false);
      navigation?.navigate('World', { planetId: id });
    } catch (err) {
      setError(err?.message || 'Could not raise this world.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <HoloPanel theme={theme} title="Add a planet" accent={accent?.mid} index={index}>
      <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
        Every new world starts from the same setup template (primary log, measure, archive). AI
        specializes those tracking systems from the context you provide.
      </Text>
      <Field
        theme={theme}
        label="Context — what should this world track?"
        value={brief}
        onChangeText={(value) => {
          setBrief(value);
          setFilled(false);
        }}
        multiline
        numberOfLines={4}
        style={styles.area}
      />
      {filled ? (
        <Field
          theme={theme}
          label="Planet name"
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          maxLength={24}
        />
      ) : null}
      <View style={[styles.template, { borderColor: theme.colors.border }]}>
        <Text style={[styles.templateLabel, typography.hud, { color: accent?.ink ?? theme.colors.text.secondary }]}>
          Setup template
        </Text>
        <Text style={[styles.templateTitle, { color: theme.colors.text.primary }]}>
          {draft.name} · {draft.domain}
        </Text>
        <Text style={[styles.templateMeta, { color: theme.colors.text.tertiary }]}>
          {draft.vibe} · {draft.cadence}
        </Text>
        {draft.systems.map((system) => (
          <View key={`${system.name}-${system.building_kind}`} style={[styles.system, { borderColor: theme.colors.border }]}>
            <Text style={[styles.systemName, typography.hud, { color: theme.colors.text.secondary }]}>
              {system.name}
            </Text>
            <Text style={[styles.systemMeta, { color: theme.colors.text.tertiary }]}>
              {system.building_name} · {system.fields.map((field) => field.label).join(' · ')}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <GlowButton
          theme={theme}
          tone={accent?.mid}
          variant="ghost"
          size="sm"
          label={busy && !filled ? 'Filling…' : 'Fill template with AI'}
          disabled={busy || !brief.trim()}
          onPress={fillTemplate}
        />
        <GlowButton
          theme={theme}
          tone={accent?.mid}
          size="sm"
          label={busy ? 'Raising…' : 'Raise planet'}
          disabled={busy || !brief.trim()}
          onPress={raise}
        />
      </View>
      {notice ? <Text style={[styles.notice, { color: theme.colors.text.secondary }]}>{notice}</Text> : null}
      {error ? <Text style={[styles.error, { color: theme.palette.status.bad }]}>{error}</Text> : null}
    </HoloPanel>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20, marginBottom: spacing.sm },
  area: { marginTop: spacing.sm },
  template: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  templateLabel: { fontSize: 10, marginBottom: 4 },
  templateTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  templateMeta: { fontSize: 11, marginTop: 2 },
  system: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  systemName: { fontSize: 10 },
  systemMeta: { fontSize: 11, marginTop: 2 },
  actions: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notice: { fontSize: typography.sizes.sm, marginTop: spacing.sm },
  error: { fontSize: typography.sizes.sm, marginTop: spacing.sm },
});

export default ForgePlanetPanel;
