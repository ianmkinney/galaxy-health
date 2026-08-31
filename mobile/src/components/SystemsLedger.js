import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { spacing, typography } from '../theme';
import { entriesRepo, systemsRepo, todayKey } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, emit } from '../state/eventBus';
import {
  draftFromSystem,
  heuristicReviseSystem,
  heuristicSystem,
  parseForgeSystem,
  preserveFieldIds,
  systemForgePrompt,
  systemRevisePrompt,
  uid,
} from '../galaxy/worldForge';
import { generateText } from '../services/aiClient';
import HoloPanel from './HoloPanel';
import GlowButton from './GlowButton';
import { Field, ScaleRow } from './Field';

const emptyValues = (fields) =>
  Object.fromEntries((fields || []).map((field) => [field.id, field.kind === 'boolean' ? 'false' : '']));

const parseValue = (field, raw) => {
  if (field.kind === 'boolean') return raw === 'true' || raw === 'on' || raw === '1';
  if (field.kind === 'number' || field.kind === 'scale' || field.kind === 'duration') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return raw;
};

const fieldSummary = (field) => {
  const how =
    field.kind === 'scale'
      ? `${field.min ?? 1}–${field.max ?? 5}`
      : field.unit
        ? `${field.kind} ${field.unit}`
        : field.kind;
  return `${field.label} (${how})`;
};

const FieldInput = ({ theme, accent, field, value, onChange }) => {
  if (field.kind === 'boolean') {
    return (
      <View style={styles.boolRow}>
        <Text style={[styles.body, { color: theme.colors.text.secondary, flex: 1 }]}>{field.label}</Text>
        <Switch
          value={value === 'true'}
          onValueChange={(on) => onChange(on ? 'true' : 'false')}
          trackColor={{ true: accent.mid, false: theme.colors.border }}
          thumbColor={theme.colors.text.primary}
        />
      </View>
    );
  }
  if (field.kind === 'scale') {
    return (
      <ScaleRow
        theme={theme}
        accent={accent}
        label={field.label}
        value={Number(value) || field.min || 1}
        onChange={(next) => onChange(String(next))}
        max={field.max || 5}
      />
    );
  }
  return (
    <Field
      theme={theme}
      label={field.unit ? `${field.label} (${field.unit})` : field.label}
      value={value}
      onChangeText={onChange}
      keyboardType={field.kind === 'text' ? 'default' : 'decimal-pad'}
    />
  );
};

const SystemCard = ({ theme, accent, system, planetId, planetName, domain, onChanged }) => {
  const [values, setValues] = useState(() => emptyValues(system.fields));
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [reviseBrief, setReviseBrief] = useState('');
  const [revising, setRevising] = useState(false);
  const [reviseNotice, setReviseNotice] = useState('');

  const fieldKey = (system.fields || []).map((field) => `${field.id}:${field.kind}:${field.label}`).join('|');

  const load = useCallback(async () => {
    setLogs(await entriesRepo.listForSystem(system.id, 8));
  }, [system.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setValues(emptyValues(system.fields));
  }, [fieldKey]);

  const log = async () => {
    setSaving(true);
    try {
      await entriesRepo.insert({
        id: uid(),
        system_id: system.id,
        planet_id: planetId,
        values: Object.fromEntries(
          (system.fields || []).map((field) => [field.id, parseValue(field, values[field.id] ?? '')])
        ),
        notes: notes.trim() || undefined,
        logged_on: todayKey(),
        created_at: Date.now(),
        source: 'user',
      });
      setValues(emptyValues(system.fields));
      setNotes('');
      emit(EVENTS.DATA_CHANGED, { source: planetId });
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const revise = async () => {
    const instruction = reviseBrief.trim();
    if (!instruction) return;
    setRevising(true);
    setReviseNotice('');
    const current = draftFromSystem(system);
    let draft = heuristicReviseSystem(current, instruction);
    let via = 'local';
    try {
      const text = await generateText(systemRevisePrompt(planetName, domain, current, instruction));
      draft = parseForgeSystem(text, instruction, current.fields);
      via = 'ai';
    } catch {
      draft = heuristicReviseSystem(current, instruction);
    }
    try {
      await systemsRepo.update({
        ...system,
        ...draft,
        fields: preserveFieldIds(system.fields || [], draft.fields),
      });
      setReviseBrief('');
      setReviseNotice(
        via === 'ai'
          ? 'System updated. What you log and how you log it now match this revision.'
          : 'System updated locally. Add an API key in Account for a richer AI revision.'
      );
      emit(EVENTS.DATA_CHANGED, { source: planetId });
      onChanged?.();
    } catch (error) {
      setReviseNotice(error.message || 'Could not save this revision.');
    } finally {
      setRevising(false);
    }
  };

  return (
    <HoloPanel theme={theme} title={system.name} meta={system.building_name} accent={accent.mid} index={1}>
      <Text style={[styles.body, { color: theme.colors.text.secondary }]}>{system.description}</Text>
      <Text style={[styles.tracks, typography.hud, { color: theme.colors.text.tertiary }]}>
        Tracks · {(system.fields || []).map(fieldSummary).join(' · ') || 'no fields'}
      </Text>
      {(system.fields || []).map((field) => (
        <FieldInput
          key={field.id}
          theme={theme}
          accent={accent}
          field={field}
          value={values[field.id] ?? ''}
          onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
        />
      ))}
      <Field theme={theme} label="Notes" value={notes} onChangeText={setNotes} />
      <View style={styles.row}>
        <GlowButton
          theme={theme}
          tone={accent.mid}
          size="sm"
          label="Log entry"
          disabled={saving}
          onPress={log}
        />
        <GlowButton
          theme={theme}
          tone={theme.palette.status.bad}
          variant="ghost"
          size="sm"
          label="Remove system"
          disabled={saving}
          onPress={async () => {
            await systemsRepo.remove(system.id);
            emit(EVENTS.DATA_CHANGED, { source: planetId });
            onChanged?.();
          }}
        />
      </View>
      <Text style={[styles.tracks, typography.hud, { color: theme.colors.text.tertiary }]}>Revise with AI</Text>
      <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
        Change what this building tracks or how each field is logged. The revision is saved on this system.
      </Text>
      <Field
        theme={theme}
        label="How should this system change?"
        value={reviseBrief}
        onChangeText={setReviseBrief}
        multiline
      />
      <GlowButton
        theme={theme}
        tone={accent.mid}
        variant="ghost"
        size="sm"
        label={revising ? 'Revising…' : 'Save revision'}
        disabled={revising || !reviseBrief.trim()}
        onPress={revise}
        style={styles.action}
      />
      {reviseNotice ? (
        <Text style={[styles.body, { color: theme.colors.text.secondary, marginTop: spacing.sm }]}>
          {reviseNotice}
        </Text>
      ) : null}
      {logs.map((row) => (
        <View key={row.id} style={[styles.log, { borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.text.secondary }}>{row.logged_on}</Text>
          <Text style={[styles.meta, { color: theme.colors.text.tertiary }]}>
            {(system.fields || [])
              .map((field) => `${field.label} ${String(row.values?.[field.id] ?? '—')}`)
              .join(' · ')}
            {row.notes ? ` · ${row.notes}` : ''}
          </Text>
        </View>
      ))}
    </HoloPanel>
  );
};

export default function SystemsLedger({ theme, accent, planetId }) {
  const { planetName, planets } = useGalaxy();
  const planet = planets.find((item) => item.id === planetId);
  const name = planetName(planetId);
  const domain = planet?.domain || 'custom tracking';
  const [systems, setSystems] = useState([]);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!planetId) return;
    setSystems(await systemsRepo.listForPlanet(planetId));
  }, [planetId]);

  useEffect(() => {
    load();
  }, [load]);

  const addSystem = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    try {
      let draft = heuristicSystem(description);
      try {
        const text = await generateText(systemForgePrompt(name, domain, description));
        draft = parseForgeSystem(text, description);
      } catch {
        // local heuristic
      }
      await systemsRepo.insert({
        id: uid(),
        planet_id: planetId,
        ...draft,
        created_at: Date.now(),
        source: 'user',
      });
      setBrief('');
      emit(EVENTS.DATA_CHANGED, { source: planetId });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <HoloPanel theme={theme} title="Add tracking system" accent={accent.mid} index={0}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          A new system raises a new building on {name}. Describe what you want to log.
        </Text>
        <Field
          theme={theme}
          label="What should this system track?"
          value={brief}
          onChangeText={setBrief}
          multiline
        />
        <GlowButton
          theme={theme}
          tone={accent.mid}
          size="sm"
          label={busy ? 'Raising…' : 'Raise building'}
          disabled={busy || !brief.trim()}
          onPress={addSystem}
          style={styles.action}
        />
      </HoloPanel>
      {systems.length === 0 ? (
        <HoloPanel theme={theme} title="Systems" accent={accent.mid} index={1}>
          <Text style={[styles.body, { color: theme.colors.text.tertiary }]}>
            No custom systems on {name} yet. Raise one and a building appears in orbit.
          </Text>
        </HoloPanel>
      ) : (
        systems.map((system) => (
          <SystemCard
            key={system.id}
            theme={theme}
            accent={accent}
            system={system}
            planetId={planetId}
            planetName={name}
            domain={domain}
            onChanged={load}
          />
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  tracks: { fontSize: 10, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  action: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  log: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  meta: { fontSize: 11, marginTop: 2 },
});
