import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { accentForPlanet, getTheme, spacing, typography } from '../theme';
import { entriesRepo, systemsRepo } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, on } from '../state/eventBus';
import ScreenShell from '../components/ScreenShell';
import HoloPanel from '../components/HoloPanel';
import StatReadout from '../components/StatReadout';
import GlowButton from '../components/GlowButton';
import SystemsLedger from '../components/SystemsLedger';
import { ChipRow } from '../components/Field';

const TABS = [
  { value: 'colony', label: 'Colony' },
  { value: 'systems', label: 'Systems' },
  { value: 'charts', label: 'Charts' },
];

const WorldScreen = ({ route, navigation }) => {
  const theme = getTheme(true);
  const planetId = route.params?.planetId;
  const { planets, planetName } = useGalaxy();
  const planet = planets.find((item) => item.id === planetId);
  const accent = accentForPlanet(planet);
  const [tab, setTab] = useState('colony');
  const [systems, setSystems] = useState([]);
  const [entries, setEntries] = useState([]);

  const load = useCallback(async () => {
    if (!planetId) return;
    const [sys, ents] = await Promise.all([
      systemsRepo.listForPlanet(planetId),
      entriesRepo.listForPlanet(planetId, 20),
    ]);
    setSystems(sys);
    setEntries(ents);
  }, [planetId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => on(EVENTS.DATA_CHANGED, load), [load]);

  const population = entries.length + systems.length * 3;
  const charts = useMemo(() => entries.slice(0, 12), [entries]);

  if (!planet) {
    return (
      <ScreenShell theme={theme} accent={accent} subtitle="Unknown world" title={planetId || 'World'} tagline="This planet is not in your registry.">
        <GlowButton theme={theme} label="← Bridge" variant="ghost" onPress={() => navigation.navigate('Bridge')} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      theme={theme}
      accent={accent}
      subtitle={`${planet.domain} · ${planet.cadence || 'As you log'}`}
      title={planetName(planetId)}
      tagline={planet.vibe || planet.tagline}
      planetId={planetId}
    >
      <ChipRow
        theme={theme}
        accent={accent}
        value={tab}
        onChange={setTab}
        options={TABS}
      />
      <Text style={[styles.pop, { color: theme.colors.text.tertiary }]}>
        Pop {population} · {systems.length} buildings · {entries.length} inputs · {systems.length} systems
      </Text>

      {tab === 'colony' ? (
        <>
          <HoloPanel theme={theme} title="Colony" accent={accent.mid} index={0}>
            <Text style={[styles.body, { color: theme.colors.text.secondary }]}>
              People arrive when you log. Population is the live count of inputs and systems on this world.
            </Text>
            <View style={styles.stats}>
              <StatReadout theme={theme} label="Population" value={population} tone={accent.mid} />
              <StatReadout theme={theme} label="Inputs" value={entries.length} tone={accent.mid} />
              <StatReadout theme={theme} label="Systems" value={systems.length} tone={accent.mid} />
            </View>
          </HoloPanel>
          <HoloPanel theme={theme} title="Buildings" meta={`${systems.length}`} accent={accent.mid} index={1}>
            {systems.length === 0 ? (
              <Text style={[styles.body, { color: theme.colors.text.tertiary }]}>
                No structures yet. Raise a system to stand one up.
              </Text>
            ) : (
              systems.map((system) => (
                <View key={system.id} style={[styles.log, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.text.primary }}>{system.building_name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.text.tertiary }]}>
                    {system.name} · {system.building_kind}
                  </Text>
                </View>
              ))
            )}
          </HoloPanel>
        </>
      ) : null}

      {tab === 'systems' ? (
        <SystemsLedger theme={theme} accent={accent} planetId={planetId} />
      ) : null}

      {tab === 'charts' ? (
        <HoloPanel theme={theme} title="Charts" accent={accent.mid} index={0}>
          {charts.length === 0 ? (
            <Text style={[styles.body, { color: theme.colors.text.tertiary }]}>
              No logs yet — charts fill as you file entries.
            </Text>
          ) : (
            charts.map((row) => (
              <View key={row.id} style={[styles.log, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.text.secondary }}>{row.logged_on}</Text>
                <Text style={[styles.meta, { color: theme.colors.text.tertiary }]}>
                  {Object.entries(row.values || {})
                    .map(([key, value]) => `${key} ${value}`)
                    .join(' · ')}
                </Text>
              </View>
            ))
          )}
        </HoloPanel>
      ) : null}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: typography.sizes.sm, lineHeight: 20 },
  pop: { fontSize: 11, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1.2 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  log: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  meta: { fontSize: 11, marginTop: 2 },
});

export default WorldScreen;
