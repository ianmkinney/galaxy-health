import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getTheme, planetAccents, spacing, typography } from '../theme';
import { observatoryRepo } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, emit } from '../state/eventBus';
import { SIGNAL_KINDS } from '../state/signalKinds';
import { PLANET_IDS } from '../galaxy/planets';
import { usePlanetInbox } from '../hooks/usePlanetInbox';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import GlowButton from '../components/GlowButton';
import LogRow from '../components/LogRow';
import InboxPanel from '../components/InboxPanel';
import { Field } from '../components/Field';

const accent = planetAccents.observatory;

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const flag = (marker, theme) => {
  if (marker.reference_low == null && marker.reference_high == null) return null;
  if (marker.reference_low != null && marker.value < marker.reference_low) {
    return { label: 'below range', color: theme.palette.status.warn };
  }
  if (marker.reference_high != null && marker.value > marker.reference_high) {
    return { label: 'above range', color: theme.palette.status.bad };
  }
  return { label: 'in range', color: theme.palette.status.good };
};

const ObservatoryScreen = () => {
  const theme = getTheme(true);
  const { planetName, sendSignal } = useGalaxy();
  const { signals } = usePlanetInbox(PLANET_IDS.OBSERVATORY);

  const [markers, setMarkers] = useState([]);
  const [form, setForm] = useState({ marker: '', value: '', unit: '', low: '', high: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setMarkers(await observatoryRepo.listRecent());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = form.marker.trim().length > 0 && form.value !== '' && !saving;

  const handleLog = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const entry = {
        marker: form.marker.trim(),
        value: form.value,
        unit: form.unit.trim() || null,
        referenceLow: form.low === '' ? null : form.low,
        referenceHigh: form.high === '' ? null : form.high,
      };
      const id = await observatoryRepo.log(entry);

      await sendSignal(
        SIGNAL_KINDS.MARKER_LOGGED,
        { marker: entry.marker, value: Number(entry.value) || 0, unit: entry.unit },
        `observatory_markers:${id}`
      );

      setForm({ marker: '', value: '', unit: form.unit, low: '', high: '' });
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.OBSERVATORY });
    } finally {
      setSaving(false);
    }
  }, [canSave, form, load, sendSignal]);

  const handleDelete = useCallback(
    async (id) => {
      await observatoryRepo.remove(id);
      await load();
      emit(EVENTS.DATA_CHANGED, { source: PLANET_IDS.OBSERVATORY });
    },
    [load]
  );

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle="Labs & biomarkers"
      title={planetName(PLANET_IDS.OBSERVATORY)}
      tagline="Manual assay intake. Everything stays on this device."
      footer={
        <GlowButton
          theme={theme}
          tone={accent.mid}
          label={saving ? 'Filing…' : 'File assay & transmit'}
          icon="planet"
          onPress={handleLog}
          disabled={!canSave}
        />
      }
    >
      <HoloPanel theme={theme} title="Station status" accent={accent.mid} index={0}>
        <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
          Type results from a blood panel and the station forwards each marker to{' '}
          {planetName(PLANET_IDS.LUMEN)}. Nothing leaves the device.
        </Text>
        <Text style={[styles.stub, { color: theme.palette.status.warn }]}>
          Stubbed: photo/PDF scanning of lab reports, reference-range libraries, and trend charts.
        </Text>
      </HoloPanel>

      <HoloPanel theme={theme} title="New assay" accent={accent.mid} index={1}>
        <Field
          theme={theme}
          label="Marker"
          value={form.marker}
          onChangeText={(marker) => setForm((prev) => ({ ...prev, marker }))}
          placeholder="Ferritin"
          returnKeyType="done"
        />
        <View style={styles.row}>
          <Field
            theme={theme}
            label="Value"
            style={styles.flex}
            value={form.value}
            onChangeText={(value) => setForm((prev) => ({ ...prev, value }))}
            keyboardType="numeric"
            placeholder="82"
          />
          <Field
            theme={theme}
            label="Unit"
            style={styles.flex}
            value={form.unit}
            onChangeText={(unit) => setForm((prev) => ({ ...prev, unit }))}
            placeholder="ng/mL"
          />
        </View>
        <View style={styles.row}>
          <Field
            theme={theme}
            label="Ref low"
            style={styles.flex}
            value={form.low}
            onChangeText={(low) => setForm((prev) => ({ ...prev, low }))}
            keyboardType="numeric"
            placeholder="30"
          />
          <Field
            theme={theme}
            label="Ref high"
            style={styles.flex}
            value={form.high}
            onChangeText={(high) => setForm((prev) => ({ ...prev, high }))}
            keyboardType="numeric"
            placeholder="400"
          />
        </View>
      </HoloPanel>

      <HoloPanel
        theme={theme}
        title="Filed results"
        meta={`${markers.length} on record`}
        accent={accent.mid}
        index={2}
      >
        {markers.length === 0 ? (
          <Text style={[styles.body, { color: theme.colors.text.tertiary }]}>
            No assays filed yet.
          </Text>
        ) : (
          markers.map((marker, index) => {
            const status = flag(marker, theme);
            return (
              <LogRow
                key={marker.id}
                theme={theme}
                accent={accent}
                index={index}
                title={marker.marker}
                meta={`${round(marker.value)}${marker.unit ? ` ${marker.unit}` : ''}`}
                detail={
                  status
                    ? `${status.label} · ${marker.collected_on}`
                    : marker.collected_on
                }
                onDelete={() => handleDelete(marker.id)}
              />
            );
          })
        )}
      </HoloPanel>

      <InboxPanel
        theme={theme}
        accent={accent}
        signals={signals}
        planetName={planetName}
        index={3}
        emptyHint="The station is a transmitter today; nothing routes back to it yet."
      />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  stub: { fontSize: typography.sizes.xs, marginTop: spacing.md, lineHeight: 17 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});

export default ObservatoryScreen;
