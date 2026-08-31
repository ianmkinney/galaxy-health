import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme';
import { useGalaxy } from '../state/GalaxyContext';
import HoloPanel from './HoloPanel';
import GlowButton from './GlowButton';
import { ChipRow, Field } from './Field';
import {
  CRAFT_META,
  TONE_META,
  coerceEventDraft,
  defaultDueAt,
  eventForgePrompt,
  formatDue,
  formatDueInput,
  heuristicEvent,
  newEventId,
  openEvents,
  parseDueInput,
  parseForgeEvent,
} from '../galaxy/galacticEvents';
import { generateText } from '../services/aiClient';

const TONE_OPTIONS = [
  { value: 'auto', label: 'AI picks' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'fun', label: 'Fun' },
  { value: 'exciting', label: 'Exciting' },
];

const GalacticSchedule = ({ theme, planetId, compact = false, index = 0 }) => {
  const { events, planets, planetName, addEvent, completeEvent, enabledPlanets } = useGalaxy();
  const all = openEvents(events);
  const rows = planetId ? all.filter((event) => event.planet_id === planetId) : all;
  const shown = compact ? rows.slice(0, 3) : rows;
  const known = (enabledPlanets || planets).map((p) => p.id);

  const [brief, setBrief] = useState('');
  const [due, setDue] = useState(() => formatDueInput(defaultDueAt()));
  const [tone, setTone] = useState('auto');
  const [world, setWorld] = useState(planetId ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(!compact);

  const worldOptions = [
    { value: '', label: 'Deep space' },
    ...(enabledPlanets || planets.filter((p) => p.enabled)).map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ];

  const hail = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError('');
    setNotice('');
    const hintTone = tone === 'auto' ? '' : tone;
    const dueAt = parseDueInput(due);
    const hintPlanet = world || planetId || null;
    const opts = { tone: hintTone, planetId: hintPlanet, knownPlanets: known };
    let draft = heuristicEvent(description, opts);
    let via = 'local';
    try {
      const catalog = (enabledPlanets || planets).map((p) => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
      }));
      const text = await generateText(
        eventForgePrompt(description, { planets: catalog, tone: hintTone, planetId: hintPlanet, dueAt })
      );
      draft = parseForgeEvent(text, description, opts);
      via = 'ai';
    } catch {
      via = 'local';
    }
    try {
      draft = coerceEventDraft(draft, description, opts);
      await addEvent({
        id: newEventId(),
        title: draft.title,
        briefing: draft.briefing,
        tone: draft.tone,
        craft: draft.craft,
        planet_id: draft.planet_id,
        due_at: dueAt,
        notes: draft.notes,
        status: 'upcoming',
        created_at: Date.now(),
        source: 'user',
      });
      setBrief('');
      setNotice(
        via === 'ai'
          ? `${CRAFT_META[draft.craft].label} parked: ${draft.title}.`
          : `Local contact forged. Add an API key in Account for a richer briefing. ${draft.title} is on the map.`
      );
    } catch (err) {
      setError(err?.message || 'Could not park this contact.');
    } finally {
      setBusy(false);
    }
  };

  const title = compact ? 'World traffic' : 'Galactic Schedule';
  const meta = compact
    ? `${rows.length} here · ${all.length} system-wide`
    : `${all.length} contact${all.length === 1 ? '' : 's'}`;

  return (
    <HoloPanel theme={theme} title={title} meta={meta} variant="hud" index={index}>
      {shown.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.text.tertiary }]}>
          {compact
            ? 'No contacts tagged to this world. Hail one — it also lands on the Bridge schedule.'
            : 'Describe a deadline, a fun night, or something exciting. AI parks a warship, envoy, leviathan, or lost astronaut in the galaxy.'}
        </Text>
      ) : (
        shown.map((event) => {
          const craft = CRAFT_META[event.craft] || CRAFT_META.warship;
          return (
            <View key={event.id} style={[styles.row, { borderColor: theme.colors.border }]}>
              <View style={styles.rowText}>
                <Text style={[styles.craft, typography.hud, { color: craft.color }]}>
                  {craft.label}
                  {event.status === 'missed' ? ' · overdue' : ''}
                </Text>
                <Text style={[styles.eventTitle, { color: theme.colors.text.primary }]}>{event.title}</Text>
                <Text style={[styles.briefing, { color: theme.colors.text.tertiary }]}>{event.briefing}</Text>
                <Text style={[styles.metaLine, { color: theme.colors.text.tertiary }]}>
                  {event.planet_id ? planetName(event.planet_id) : 'Deep space'} · {formatDue(event.due_at)}
                </Text>
              </View>
              <GlowButton
                theme={theme}
                label="Clear"
                variant="ghost"
                size="sm"
                onPress={() => completeEvent(event.id)}
              />
            </View>
          );
        })
      )}

      {compact && !openForm ? (
        <GlowButton
          theme={theme}
          label="Hail a contact"
          variant="ghost"
          size="sm"
          onPress={() => setOpenForm(true)}
          style={styles.hail}
        />
      ) : (
        <View>
          <Field
            theme={theme}
            label="What's coming?"
            value={brief}
            onChangeText={setBrief}
            placeholder="Tax return Friday · dinner with friends · help a neighbor…"
            multiline
          />
          <Field
            theme={theme}
            label="Due (YYYY-MM-DD HH:mm)"
            value={due}
            onChangeText={setDue}
          />
          <ChipRow
            theme={theme}
            accent={{
              mid: TONE_META[tone] ? TONE_META[tone].color : theme.palette.plasma[300],
              ink: '#fff',
              glow: 'rgba(255,255,255,0.08)',
            }}
            label="Tone"
            options={TONE_OPTIONS}
            value={tone}
            onChange={setTone}
          />
          <ChipRow
            theme={theme}
            accent={{ mid: theme.palette.plasma[300], ink: '#fff', glow: 'rgba(255,255,255,0.08)' }}
            label="World"
            options={worldOptions}
            value={world}
            onChange={setWorld}
          />
          <GlowButton
            theme={theme}
            label={busy ? 'Forging…' : 'Forge into the galaxy'}
            onPress={hail}
            disabled={busy || !brief.trim()}
            style={styles.hail}
          />
          {notice ? <Text style={[styles.notice, { color: theme.palette.plasma[300] }]}>{notice}</Text> : null}
          {error ? <Text style={[styles.notice, { color: theme.palette.status.bad }]}>{error}</Text> : null}
        </View>
      )}
    </HoloPanel>
  );
};

const styles = StyleSheet.create({
  empty: { fontSize: typography.sizes.sm, lineHeight: 20 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowText: { flex: 1 },
  craft: { fontSize: 9.5, letterSpacing: 1.4 },
  eventTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, marginTop: 2 },
  briefing: { fontSize: typography.sizes.xs, marginTop: 4, lineHeight: 16 },
  metaLine: { fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  hail: { marginTop: spacing.md },
  notice: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
});

export default GalacticSchedule;
