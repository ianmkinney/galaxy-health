import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { accentForPlanet, getTheme, motion, planetAccents, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useGalaxy } from '../state/GalaxyContext';
import { SIGNAL_LABEL, describeSignal } from '../state/signalKinds';
import SolarSystem from '../galaxy/SolarSystem';
import CockpitFrame from '../galaxy/CockpitFrame';
import WarpOverlay from '../galaxy/WarpOverlay';
import useOrbitClock from '../galaxy/useOrbitClock';
import HoloPanel from '../components/HoloPanel';
import StatReadout from '../components/StatReadout';
import GlowButton, { GlowIconButton } from '../components/GlowButton';
import AnimatedPressable from '../components/AnimatedPressable';
import ForgePlanetPanel from '../components/ForgePlanetPanel';
import GalacticSchedule from '../components/GalacticSchedule';
import { openEvents } from '../galaxy/galacticEvents';

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const BridgeScreen = ({ navigation }) => {
  const theme = getTheme(true);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { enabledPlanets, planetName, totals, inFlight, events } = useGalaxy();

  const clock = useOrbitClock(!reduceMotion);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [warpTarget, setWarpTarget] = useState(null);

  // Coming back from a planet must always leave the canopy clear.
  useFocusEffect(useCallback(() => () => setWarpTarget(null), []));

  const handleSelect = useCallback((planet) => {
    setWarpTarget(planet);
  }, []);

  const handleWarpComplete = useCallback(
    (planet) => {
      setWarpTarget(null);
      navigation.navigate(planet.route, { planetId: planet.id });
    },
    [navigation]
  );

  const onViewportLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((prev) =>
      Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
        ? prev
        : { width, height }
    );
  }, []);

  const fuel = totals.galley;
  const load = totals.atlas;
  const mind = totals.lumen;
  const netFuel = round(fuel.calories - load.burn);
  const contacts = openEvents(events);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}>
      <View style={styles.viewport} onLayout={onViewportLayout}>
        {viewport.width > 0 ? (
          <>
            <SolarSystem
              width={viewport.width}
              height={viewport.height}
              planets={enabledPlanets}
              signals={inFlight}
              events={events}
              clock={clock}
              animate={!reduceMotion}
              onSelectPlanet={handleSelect}
              onSelectCore={() => navigation.navigate('FirstMate')}
            />
            <CockpitFrame
              width={viewport.width}
              height={viewport.height}
              accent={theme.palette.plasma[300]}
            />
          </>
        ) : null}

        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.slow)}
          style={[styles.titleBlock, { top: insets.top + spacing.sm }]}
          pointerEvents="none"
        >
          <Text style={[styles.eyebrow, typography.hud, { color: theme.palette.plasma[300] }]}>
            The Bridge
          </Text>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Galaxy Health</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
            {contacts.length > 0
              ? `${contacts.length} galactic contact${contacts.length === 1 ? '' : 's'}`
              : inFlight.length > 0
                ? `${inFlight.length} transmission${inFlight.length === 1 ? '' : 's'} in transit`
                : 'All systems nominal'}
          </Text>
        </Animated.View>

        <View style={[styles.topRight, { top: insets.top + spacing.sm }]}>
          <GlowIconButton
            theme={theme}
            icon="pulse"
            tone="#7AF0FF"
            onPress={() => navigation.navigate('FirstMate')}
            accessibilityLabel="Talk to First Mate"
          />
          <GlowIconButton
            theme={theme}
            icon="options"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Open ship settings"
            style={styles.topRightSpacer}
          />
          <GlowIconButton
            theme={theme}
            icon="radio"
            tone={theme.palette.status.info}
            onPress={() => navigation.navigate('SignalLog')}
            accessibilityLabel="Open signal log"
            style={styles.topRightSpacer}
          />
        </View>
      </View>

      {/* Console */}
      <ScrollView
        style={[styles.console, { borderTopColor: theme.colors.borderStrong }]}
        contentContainerStyle={[
          styles.consoleContent,
          { paddingBottom: insets.bottom + spacing.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HoloPanel theme={theme} title="Vitals — today" variant="hud" index={0}>
          <View style={styles.statRow}>
            <StatReadout
              theme={theme}
              label="Fuel in"
              value={round(fuel.calories)}
              unit="kcal"
              tone={planetAccents.galley.mid}
            />
            <StatReadout
              theme={theme}
              label="Burned"
              value={round(load.burn)}
              unit="kcal"
              tone={planetAccents.atlas.mid}
            />
            <StatReadout
              theme={theme}
              label="Net"
              value={netFuel > 0 ? `+${netFuel}` : `${netFuel}`}
              unit="kcal"
              tone={netFuel > 0 ? theme.palette.status.warn : theme.palette.status.good}
            />
            <StatReadout
              theme={theme}
              label="Clarity"
              value={mind.entries > 0 ? round(mind.focus, 1) : '—'}
              unit={mind.entries > 0 ? '/5' : undefined}
              tone={planetAccents.lumen.mid}
            />
          </View>
          <View style={styles.statRowSecondary}>
            <StatReadout
              theme={theme}
              label="Protein"
              value={round(fuel.protein)}
              unit="g"
              compact
            />
            <StatReadout theme={theme} label="Active" value={round(load.minutes)} unit="min" compact />
            <StatReadout
              theme={theme}
              label="Sleep"
              value={mind.entries > 0 ? round(mind.sleep, 1) : '—'}
              unit={mind.entries > 0 ? 'h' : undefined}
              compact
            />
            <StatReadout theme={theme} label="Assays" value={totals.observatory.markers} compact />
          </View>
        </HoloPanel>

        {inFlight.length > 0 ? (
          <HoloPanel
            theme={theme}
            title="In transit"
            meta={`${inFlight.length} queued`}
            variant="sunken"
            index={1}
          >
            {inFlight.slice(0, 3).map((signal, index) => (
              <Animated.View
                key={signal.id}
                entering={
                  reduceMotion
                    ? undefined
                    : FadeInDown.delay(index * motion.stagger).springify()
                }
                style={styles.signalRow}
              >
                <View
                  style={[
                    styles.signalDot,
                    { backgroundColor: planetAccents[signal.from]?.mid ?? theme.colors.border },
                  ]}
                />
                <View style={styles.signalText}>
                  <Text style={[styles.signalRoute, { color: theme.colors.text.secondary }]}>
                    {planetName(signal.from)} → {planetName(signal.to)}
                  </Text>
                  <Text style={[styles.signalDetail, { color: theme.colors.text.tertiary }]}>
                    {SIGNAL_LABEL[signal.kind] ?? 'Signal'} · {describeSignal(signal)}
                  </Text>
                </View>
              </Animated.View>
            ))}
            <Text style={[styles.signalHint, { color: theme.colors.text.tertiary }]}>
              Ships land when you arrive at the destination planet.
            </Text>
          </HoloPanel>
        ) : null}

        <HoloPanel theme={theme} title="Nav dock" variant="hud" index={2}>
          <View style={styles.dock}>
            {enabledPlanets.map((planet) => {
              const accent = accentForPlanet(planet);
              const inbound = inFlight.filter((signal) => signal.to === planet.id).length;
              return (
                <AnimatedPressable
                  key={planet.id}
                  onPress={() => handleSelect(planet)}
                  lift={-2}
                  haptic="medium"
                  accessibilityRole="button"
                  accessibilityLabel={`Warp to ${planet.name}`}
                  style={[
                    styles.dockItem,
                    {
                      borderColor: accent.mid,
                      backgroundColor: theme.colors.surfaceRaised,
                    },
                  ]}
                >
                  <View style={[styles.dockOrb, { backgroundColor: accent.mid }]} />
                  <Text numberOfLines={1} style={[styles.dockName, { color: accent.ink }]}>
                    {planet.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.dockDomain, { color: theme.colors.text.tertiary }]}>
                    {planet.domain}
                  </Text>
                  {inbound > 0 ? (
                    <View style={[styles.dockBadge, { backgroundColor: accent.mid }]}>
                      <Text style={[styles.dockBadgeText, { color: theme.colors.text.inverse }]}>
                        {inbound}
                      </Text>
                    </View>
                  ) : null}
                </AnimatedPressable>
              );
            })}
          </View>
          <View style={styles.consoleActions}>
            <GlowButton
              theme={theme}
              label="Talk to First Mate"
              icon="pulse"
              size="sm"
              tone="#7AF0FF"
              onPress={() => navigation.navigate('FirstMate')}
            />
            <GlowButton
              theme={theme}
              label="Synthesize today"
              icon="planet"
              variant="ghost"
              size="sm"
              tone={planetAccents.observatory.mid}
              onPress={() => navigation.navigate('Synthesis')}
            />
            <GlowButton
              theme={theme}
              label="Ship settings"
              icon="construct"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </HoloPanel>

        <GalacticSchedule theme={theme} index={2} />

        <ForgePlanetPanel theme={theme} accent={planetAccents.lumen} navigation={navigation} index={3} />
      </ScrollView>

      <WarpOverlay
        target={warpTarget}
        accent={warpTarget ? accentForPlanet(warpTarget).mid : theme.palette.plasma[300]}
        onComplete={handleWarpComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1, minHeight: 260 },
  titleBlock: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  eyebrow: { fontSize: 10, letterSpacing: 3 },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.black, marginTop: 2 },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  topRight: { position: 'absolute', right: spacing.base, flexDirection: 'row' },
  topRightSpacer: { marginLeft: spacing.sm },
  console: { maxHeight: '46%', borderTopWidth: 1 },
  consoleContent: { padding: spacing.base, gap: spacing.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    opacity: 0.9,
  },
  signalRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  signalDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, marginRight: spacing.sm },
  signalText: { flex: 1 },
  signalRoute: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  signalDetail: { fontSize: typography.sizes.xs, marginTop: 1 },
  signalHint: { fontSize: 10, marginTop: spacing.sm, fontStyle: 'italic' },
  dock: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dockItem: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dockOrb: { width: 12, height: 12, borderRadius: 6, marginBottom: spacing.sm },
  dockName: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  dockDomain: { fontSize: 10, marginTop: 1 },
  dockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dockBadgeText: { fontSize: 10, fontWeight: '800' },
  consoleActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

export default BridgeScreen;
