import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { lumenRepo, todayKey } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, emit } from '../state/eventBus';
import { SIGNAL_KINDS } from '../state/signalKinds';
import { PLANET_IDS } from '../galaxy/planets';
import { usePlanetInbox } from '../hooks/usePlanetInbox';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import StatReadout from '../components/StatReadout';
import GlowButton from '../components/GlowButton';
import LogRow from '../components/LogRow';
import InboxPanel from '../components/InboxPanel';
import SystemsLedger from '../components/SystemsLedger';
import { ChipRow, Field, ScaleRow } from '../components/Field';

const accent = planetAccents.lumen;

const TABS = [
  { value: 'checkin', label: 'Check-in' },
  { value: 'systems', label: 'Systems' },
];

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

// Readiness is a blend of how you feel, how sharp you are, and how much you
// slept — computed locally, no model required.
const readinessScore = (mood, focus, sleepHours) => {
  const sleepScore = Math.max(0, Math.min(5, ((Number(sleepHours) || 0) / 8) * 5));
  return (Number(mood) * 0.35 + Number(focus) * 0.35 + sleepScore * 0.3);
};

const LumenScreen = () => {
  const theme = getTheme(true);
  const { planetName, sendSignal } = useGalaxy();
  const { signals } = usePlanetInbox(PLANET_IDS.LUMEN);

  const [checkins, setCheckins] = useState([]);
  const [totals, setTotals] = useState({ mood: 0, focus: 0, sleep: 0, entries: 0 });
  const [form, setForm] = useState({ mood: 3, focus: 3, sleepHours: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('checkin');

  const load = useCallback(async () => {
    const day = todayKey();
    const [rows, sums] = await Promise.all([
      lumenRepo.listForDay(day),
      lumenRepo.totalsForDay(day),
    ]);
    setCheckins(rows);
    setTotals(sums);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projected = readinessScore(form.mood, form.focus, form.sleepHours);

  const handleLog = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const checkin = {
        mood: form.mood,
        focus: form.focus,
        sleepHours: form.sleepHours,
        note: form.note.trim() || null,
      };
      const id = await lumenRepo.log(checkin);

      await sendSignal(
        SIGNAL_KINDS.READINESS_LOGGED,
        {
          readiness: readinessScore(form.mood, form.focus, form.sleepHours),
          sleepHours: Number(form.sleepHours) || 0,
          mood: form.mood,
          focus: form.focus,
        },
        `lumen_checkins:${id}`
      );

      setForm({ mood: form.mood, focus: form.focus, sleepHours: '', note: '' });
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.LUMEN });
    } finally {
      setSaving(false);
    }
  }, [form, load, saving, sendSignal]);

  const handleDelete = useCallback(
    async (id) => {
      await lumenRepo.remove(id);
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.LUMEN });
    },
    [load]
  );

  const inboundLoad = signals
    .filter((signal) => signal.kind === SIGNAL_KINDS.LOAD_LOGGED)
    .reduce((sum, signal) => sum + (Number(signal.payload?.load) || 0), 0);
  const assays = signals.filter((signal) => signal.kind === SIGNAL_KINDS.MARKER_LOGGED).length;

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Mind & recovery"
      title={planetName(PLANET_IDS.LUMEN)}
      tagline="Mood, focus, and sleep — the clarity signal."
      planetId={PLANET_IDS.LUMEN}
      footer={
        tab === 'checkin' ? (
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label={saving ? 'Logging…' : `Log check-in · readiness ${round(projected, 1)}/5`}
            icon="sparkles"
            onPress={handleLog}
            disabled={saving}
          />
        ) : null
      }
    >
      <ChipRow
        theme={theme}
        accent={accent}
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === 'systems' ? (
        <SystemsLedger theme={theme} accent={accent} planetId={PLANET_IDS.LUMEN} />
      ) : (
        <>
      <HoloPanel theme={theme} title="Clarity — today" accent={accent.mid} index={0}>
        <View style={styles.stats}>
          <StatReadout
            theme={theme}
            label="Mood"
            value={totals.entries > 0 ? round(totals.mood, 1) : '—'}
            unit={totals.entries > 0 ? '/5' : undefined}
            tone={accent.mid}
          />
          <StatReadout
            theme={theme}
            label="Focus"
            value={totals.entries > 0 ? round(totals.focus, 1) : '—'}
            unit={totals.entries > 0 ? '/5' : undefined}
          />
          <StatReadout theme={theme} label="Sleep" value={round(totals.sleep, 1)} unit="h" />
          <StatReadout
            theme={theme}
            label="Load in"
            value={round(inboundLoad, 1)}
            tone={planetAccents.atlas.mid}
          />
        </View>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          {inboundLoad > 0
            ? `${planetName(PLANET_IDS.ATLAS)} reported ${round(inboundLoad, 1)} units of training load today.`
            : `Training load will appear here once ${planetName(PLANET_IDS.ATLAS)} transmits a session.`}
          {assays > 0 ? ` ${assays} assay result${assays === 1 ? '' : 's'} received.` : ''}
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="Check in" accent={accent.mid} index={1}>
        <ScaleRow
          theme={theme}
          accent={accent}
          label="Mood"
          value={form.mood}
          onChange={(mood) => setForm((prev) => ({ ...prev, mood }))}
        />
        <ScaleRow
          theme={theme}
          accent={accent}
          label="Focus"
          value={form.focus}
          onChange={(focus) => setForm((prev) => ({ ...prev, focus }))}
        />
        <Field
          theme={theme}
          label="Sleep last night"
          unit="h"
          value={form.sleepHours}
          onChangeText={(sleepHours) => setForm((prev) => ({ ...prev, sleepHours }))}
          keyboardType="numeric"
          placeholder="7.5"
        />
        <Field
          theme={theme}
          label="Note (optional)"
          value={form.note}
          onChangeText={(note) => setForm((prev) => ({ ...prev, note }))}
          placeholder="Sharp after the morning walk"
          multiline
        />
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Today's check-ins"
        meta={`${checkins.length} logged`}
        accent={accent.mid}
        index={2}
      >
        {checkins.length === 0 ? (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Nothing logged yet.
          </Text>
        ) : (
          checkins.map((checkin, index) => (
            <LogRow
              key={checkin.id}
              theme={theme}
              accent={accent}
              index={index}
              title={`Readiness ${round(readinessScore(checkin.mood, checkin.focus, checkin.sleep_hours), 1)}/5`}
              meta={`Mood ${checkin.mood} · Focus ${checkin.focus} · ${round(checkin.sleep_hours, 1)}h sleep`}
              detail={checkin.note ?? undefined}
              onDelete={() => handleDelete(checkin.id)}
            />
          ))
        )}
      </HoloPanel>

      <InboxPanel
        theme={theme}
        accent={accent}
        signals={signals}
        planetName={planetName}
        index={3}
        emptyHint={`Sessions from ${planetName(PLANET_IDS.ATLAS)} and assays from ${planetName(PLANET_IDS.OBSERVATORY)} land here.`}
      />
        </>
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: typography.sizes.xs, marginTop: spacing.md, lineHeight: 17 },
});

export default LumenScreen;
