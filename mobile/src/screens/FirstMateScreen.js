import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getTheme, spacing, starColor, typography } from '../theme';
import { useGalaxy } from '../state/GalaxyContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { firstMateRepo } from '../db/repositories';
import { talkToFirstMate } from '../services/firstMate';
import { buildNeuralCore2d } from '../galaxy/neuralCore';
import GlowButton from '../components/GlowButton';
import AnimatedPressable from '../components/AnimatedPressable';

const ACCENT = '#7AF0FF';
const VIOLET = '#C4B5FF';

const MiniLattice = ({ mood, animate }) => {
  const core = useMemo(() => buildNeuralCore2d(36, 28, 10), []);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      spin.value = withTiming(0, { duration: 200 });
      pulse.value = withTiming(0, { duration: 200 });
      return undefined;
    }
    if (mood === 'thinking') {
      spin.value = withRepeat(
        withTiming(360, { duration: 1800, easing: Easing.linear }),
        -1,
        false
      );
      pulse.value = withTiming(0, { duration: 200 });
    } else if (mood === 'talking') {
      spin.value = withTiming(spin.value, { duration: 180 });
      pulse.value = withRepeat(
        withTiming(1, { duration: 480, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else if (mood === 'listening') {
      spin.value = withTiming(0, { duration: 200 });
      pulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      spin.value = withTiming(0, { duration: 280 });
      pulse.value = withTiming(0, { duration: 280 });
    }
    return undefined;
  }, [animate, mood, pulse, spin]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: 1 + pulse.value * 0.1 }],
  }));

  return (
    <Animated.View style={[{ width: 88, height: 88 }, style]}>
      <Svg width={88} height={88} viewBox="-44 -44 88 88">
        <Circle cx={0} cy={0} r={18} fill={VIOLET} opacity={0.18} />
        {core.axons.map((d, index) => (
          <Path
            key={`axon-${index}`}
            d={d}
            stroke={index % 2 === 0 ? starColor.core : starColor.mid}
            strokeWidth={1.1}
            strokeOpacity={0.7}
            fill="none"
          />
        ))}
        {core.points.map((p, index) => (
          <Circle key={`n-${index}`} cx={p.x} cy={p.y} r={1.5} fill={starColor.core} />
        ))}
      </Svg>
    </Animated.View>
  );
};

const FirstMateScreen = ({ navigation }) => {
  const theme = getTheme(true);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { settings } = useGalaxy();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const listRef = useRef(null);
  const recRef = useRef(null);

  const load = useCallback(async () => {
    const rows = await firstMateRepo.list();
    setMessages(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
      return () => {
        recRef.current?.stop?.();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }, [load])
  );

  useEffect(() => {
    listRef.current?.scrollToEnd?.({ animated: true });
  }, [messages.length]);

  const speakReply = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setMood('talking');
      setTimeout(() => setMood('idle'), Math.min(2200, 400 + text.length * 16));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.onstart = () => setMood('talking');
    utterance.onend = () => setMood('idle');
    utterance.onerror = () => setMood('idle');
    window.speechSynthesis.speak(utterance);
  };

  const send = async (text, fromVoice) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError('');
    setDraft('');
    setMood('thinking');
    try {
      const result = await talkToFirstMate(trimmed, settings);
      await load();
      if (fromVoice) speakReply(result.reply);
      else {
        setMood('talking');
        setTimeout(() => setMood('idle'), Math.min(2200, 400 + String(result.reply).length * 16));
      }
    } catch (err) {
      setError(err?.message || 'First Mate failed');
      setMood('idle');
    } finally {
      setBusy(false);
      setListening(false);
    }
  };

  const toggleListen = () => {
    const Ctor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!Ctor) {
      setError('Voice listen is available in Chrome / Edge (web). Type your log on device.');
      return;
    }
    if (listening) {
      recRef.current?.stop?.();
      setListening(false);
      setMood('idle');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (spoken) void send(spoken, true);
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.start();
    recRef.current = rec;
    setListening(true);
    setMood('listening');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={[styles.back, { color: ACCENT }]}>← BRIDGE</Text>
        </AnimatedPressable>
        <View style={styles.latticeWrap}>
          <MiniLattice mood={mood} animate={!reduceMotion} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>First Mate</Text>
        <Text style={[styles.tag, { color: theme.colors.text.tertiary }]}>
          The lattice worlds orbit. Log a meal, a run, sleep — or just talk.
        </Text>
      </View>

      <ScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.text.tertiary }]}>
            Nothing on the log yet. Try “oats 420 kcal, ran 30 min, slept 7.5h”.
          </Text>
        ) : (
          messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubbleWrap, m.role === 'user' ? styles.right : styles.left]}
            >
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor:
                      m.role === 'user' ? 'rgba(122, 240, 255, 0.12)' : 'rgba(196, 181, 255, 0.14)',
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, lineHeight: 21 }}>
                  {m.text}
                </Text>
              </View>
            </View>
          ))
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            paddingBottom: insets.bottom + spacing.md,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Tell First Mate what happened…"
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceSunken,
            },
          ]}
        />
        <View style={styles.actions}>
          <GlowButton
            theme={theme}
            label={busy ? 'Thinking…' : 'Send'}
            tone={ACCENT}
            size="sm"
            disabled={busy || !draft.trim()}
            onPress={() => void send(draft, false)}
          />
          <GlowButton
            theme={theme}
            label={listening ? 'Listening…' : 'Talk'}
            tone={VIOLET}
            variant="ghost"
            size="sm"
            disabled={busy}
            onPress={toggleListen}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  back: { fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  latticeWrap: { alignItems: 'center', marginTop: spacing.sm },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.black,
    textAlign: 'center',
    marginTop: 4,
  },
  tag: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: 4 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.md, gap: spacing.sm },
  empty: { fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  bubbleWrap: { maxWidth: '90%' },
  right: { alignSelf: 'flex-end' },
  left: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  error: { color: '#FF8FA3', marginTop: spacing.sm, fontSize: 13 },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

export default FirstMateScreen;
