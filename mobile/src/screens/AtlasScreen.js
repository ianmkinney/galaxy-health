import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { atlasRepo, todayKey } from '../db/repositories';
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

const accent = planetAccents.atlas;

const TABS = [
  { value: 'sessions', label: 'Sessions' },
  { value: 'systems', label: 'Systems' },
];

const MODALITIES = [
  { value: 'strength', label: 'Strength', met: 6.0 },
  { value: 'run', label: 'Run', met: 9.8 },
  { value: 'ride', label: 'Ride', met: 7.5 },
  { value: 'mobility', label: 'Mobility', met: 2.8 },
];

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

// Rough MET-based estimate so a burn figure exists without any cloud service.
// Assumes a 75 kg default; the point is a consistent relative number, not
// clinical accuracy.
const estimateBurn = (modality, minutes, intensity) => {
  const base = MODALITIES.find((m) => m.value === modality)?.met ?? 5;
  const scaled = base * (0.7 + (Number(intensity) || 3) * 0.12);
  return (scaled * 3.5 * 75) / 200 * (Number(minutes) || 0);
};

const AtlasScreen = () => {
  const theme = getTheme(true);
  const { planetName, sendSignal } = useGalaxy();
  const { signals } = usePlanetInbox(PLANET_IDS.ATLAS);

  const [workouts, setWorkouts] = useState([]);
  const [totals, setTotals] = useState({ minutes: 0, burn: 0, intensity: 0, entries: 0 });
  const [form, setForm] = useState({
    name: '',
    modality: 'strength',
    minutes: '',
    intensity: 3,
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('sessions');

  const load = useCallback(async () => {
    const day = todayKey();
    const [rows, sums] = await Promise.all([
      atlasRepo.listForDay(day),
      atlasRepo.totalsForDay(day),
    ]);
    setWorkouts(rows);
    setTotals(sums);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projectedBurn = useMemo(
    () => estimateBurn(form.modality, form.minutes, form.intensity),
    [form.intensity, form.minutes, form.modality]
  );

  const canSave = form.name.trim().length > 0 && Number(form.minutes) > 0 && !saving;

  const handleLog = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const burn = estimateBurn(form.modality, form.minutes, form.intensity);
      const minutes = Number(form.minutes) || 0;
      const workout = {
        name: form.name.trim(),
        modality: form.modality,
        minutes,
        intensity: form.intensity,
        burn,
      };
      const id = await atlasRepo.log(workout);

      // Two hand-offs from one session: the calorie cost goes back to the
      // galley, the training load goes to Lumen for recovery context.
      await sendSignal(
        SIGNAL_KINDS.BURN_LOGGED,
        { name: workout.name, burn, minutes },
        `atlas_workouts:${id}`
      );
      await sendSignal(
        SIGNAL_KINDS.LOAD_LOGGED,
        { name: workout.name, load: (minutes * form.intensity) / 10 },
        `atlas_workouts:${id}`
      );

      setForm({ name: '', modality: form.modality, minutes: '', intensity: form.intensity });
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.ATLAS });
    } finally {
      setSaving(false);
    }
  }, [canSave, form, load, sendSignal]);

  const handleDelete = useCallback(
    async (id) => {
      await atlasRepo.remove(id);
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.ATLAS });
    },
    [load]
  );

  // Fuel delivered from the Galley is the budget Atlas plans against.
  const fuelIn = signals
    .filter((signal) => signal.kind === SIGNAL_KINDS.MACROS_LOGGED)
    .reduce(
      (acc, signal) => ({
        calories: acc.calories + (Number(signal.payload?.calories) || 0),
        protein: acc.protein + (Number(signal.payload?.protein) || 0),
      }),
      { calories: 0, protein: 0 }
    );

  const readiness = signals.find((signal) => signal.kind === SIGNAL_KINDS.READINESS_LOGGED);

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Strength & movement"
      title={planetName(PLANET_IDS.ATLAS)}
      tagline="Load, minutes, and what it cost you."
      planetId={PLANET_IDS.ATLAS}
      footer={
        tab === 'sessions' ? (
          <GlowButton
            theme={theme}
            tone={accent.mid}
            label={saving ? 'Logging…' : `Log session · ~${round(projectedBurn)} kcal`}
            icon="barbell"
            onPress={handleLog}
            disabled={!canSave}
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
        <SystemsLedger theme={theme} accent={accent} planetId={PLANET_IDS.ATLAS} />
      ) : (
        <>
      <HoloPanel theme={theme} title="Load — today" accent={accent.mid} index={0}>
        <View style={styles.stats}>
          <StatReadout theme={theme} label="Burned" value={round(totals.burn)} unit="kcal" tone={accent.mid} />
          <StatReadout theme={theme} label="Active" value={round(totals.minutes)} unit="min" />
          <StatReadout
            theme={theme}
            label="Avg RPE"
            value={totals.entries > 0 ? round(totals.intensity, 1) : '—'}
            unit={totals.entries > 0 ? '/5' : undefined}
          />
          <StatReadout theme={theme} label="Sessions" value={totals.entries} />
        </View>
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Fuel available"
        accent={planetAccents.galley.mid}
        meta="from the galley"
        index={1}
      >
        <View style={styles.stats}>
          <StatReadout
            theme={theme}
            label="Delivered"
            value={round(fuelIn.calories)}
            unit="kcal"
            tone={planetAccents.galley.mid}
          />
          <StatReadout theme={theme} label="Protein" value={round(fuelIn.protein)} unit="g" />
          <StatReadout
            theme={theme}
            label="Headroom"
            value={round(fuelIn.calories - totals.burn)}
            unit="kcal"
          />
          <StatReadout
            theme={theme}
            label="Readiness"
            value={readiness ? round(readiness.payload?.readiness, 1) : '—'}
            unit={readiness ? '/5' : undefined}
            tone={planetAccents.lumen.mid}
          />
        </View>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          These numbers only exist because {planetName(PLANET_IDS.GALLEY)} and{' '}
          {planetName(PLANET_IDS.LUMEN)} transmitted them.
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="New session" accent={accent.mid} index={2}>
        <Field
          theme={theme}
          label="Session"
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="Lower body — squat focus"
          returnKeyType="done"
        />
        <ChipRow
          theme={theme}
          accent={accent}
          label="Modality"
          options={MODALITIES}
          value={form.modality}
          onChange={(modality) => setForm((prev) => ({ ...prev, modality }))}
        />
        <Field
          theme={theme}
          label="Duration"
          unit="min"
          value={form.minutes}
          onChangeText={(minutes) => setForm((prev) => ({ ...prev, minutes }))}
          keyboardType="numeric"
          placeholder="45"
        />
        <ScaleRow
          theme={theme}
          accent={accent}
          label="Perceived effort"
          value={form.intensity}
          onChange={(intensity) => setForm((prev) => ({ ...prev, intensity }))}
        />
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Today's sessions"
        meta={`${workouts.length} logged`}
        accent={accent.mid}
        index={3}
      >
        {workouts.length === 0 ? (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Nothing logged yet.
          </Text>
        ) : (
          workouts.map((workout, index) => (
            <LogRow
              key={workout.id}
              theme={theme}
              accent={accent}
              index={index}
              title={workout.name}
              meta={`${round(workout.minutes)} min · ~${round(workout.burn)} kcal · RPE ${workout.intensity}`}
              detail={workout.modality}
              onDelete={() => handleDelete(workout.id)}
            />
          ))
        )}
      </HoloPanel>

      <InboxPanel
        theme={theme}
        accent={accent}
        signals={signals}
        planetName={planetName}
        index={4}
        emptyHint={`Log a meal on ${planetName(PLANET_IDS.GALLEY)} to see its manifest arrive.`}
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

export default AtlasScreen;
