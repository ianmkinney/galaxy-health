import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion, spacing, typography } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import Starfield from '../galaxy/Starfield';
import PlanetBody from '../galaxy/PlanetBody';
import GalacticSchedule from './GalacticSchedule';

// Every planet surface: the same sky, an oversized planet crest in the header,
// and a scrolling body. Keeps the shell identity present after warp so a planet
// never feels like a different app.
const ScreenShell = ({ theme, accent, title, subtitle, tagline, children, footer, planetId }) => {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(200);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}>
      <View style={[styles.sky, { height: headerHeight + 60 }]}>
        <Starfield width={width} height={headerHeight + 60} animate={!reduceMotion} />
        <View
          style={[
            styles.crest,
            { right: -width * 0.16, top: -width * 0.2 },
          ]}
          pointerEvents="none"
        >
          <PlanetBody radius={width * 0.3} accent={accent} box={width * 1.2} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          entering={reduceMotion ? undefined : FadeInDown.duration(motion.duration.enter).springify()}
          style={styles.header}
        >
          {subtitle ? (
            <Text style={[styles.eyebrow, typography.hud, { color: accent.mid }]}>{subtitle}</Text>
          ) : null}
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
          {tagline ? (
            <Text style={[styles.tagline, { color: theme.colors.text.tertiary }]}>{tagline}</Text>
          ) : null}
        </Animated.View>

        <View style={styles.body}>
          {planetId ? <GalacticSchedule theme={theme} planetId={planetId} compact index={0} /> : null}
          {children}
        </View>
      </ScrollView>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
            },
            Platform.OS === 'web' ? styles.webBlur : null,
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  sky: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  crest: { position: 'absolute', opacity: 0.55 },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  header: { paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { fontSize: 10, letterSpacing: 3 },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  tagline: { fontSize: typography.sizes.sm, marginTop: 4 },
  body: { gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  webBlur: {
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  },
});

export default ScreenShell;
