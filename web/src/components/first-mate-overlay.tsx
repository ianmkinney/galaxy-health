"use client";

import { useEffect, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import type { FirstMateMessage, FirstMateMood } from "@/lib/galaxy-types";
import { canListen, startListening, speakText, stopSpeaking } from "@/lib/first-mate-voice";

const ACCENT = "#7AF0FF";

export function FirstMateOverlay({
  open,
  onClose,
  mood,
  onMood,
}: {
  open: boolean;
  onClose: () => void;
  mood: FirstMateMood;
  onMood: (mood: FirstMateMood) => void;
}) {
  const { store, refresh } = useGalaxy();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const listenRef = useRef<{ stop: () => void } | null>(null);
  const speakRef = useRef<{ stop: () => void } | null>(null);
  const handingOff = useRef(false);
  const moodGen = useRef(0);

  const messages: FirstMateMessage[] = store.firstMate?.messages ?? [];

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages.length]);

  useEffect(() => {
    return () => {
      listenRef.current?.stop();
      speakRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      listenRef.current?.stop();
      speakRef.current?.stop();
      stopSpeaking();
      onMood("idle");
    }
  }, [open, onMood]);

  const send = async (text: string, fromVoice: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setDraft("");
    handingOff.current = true;
    const gen = ++moodGen.current;
    onMood("thinking");
    try {
      const res = await fetch("/api/first-mate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, channel: "web" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "First Mate failed");
      await refresh({ quiet: true });
      const reply = String(data.reply || "");
      if (fromVoice && reply) {
        speakRef.current = speakText(reply, {
          onStart: () => {
            if (moodGen.current === gen) onMood("talking");
          },
          onEnd: () => {
            if (moodGen.current === gen) onMood("idle");
            speakRef.current = null;
          },
        });
      } else {
        onMood("talking");
        window.setTimeout(() => {
          if (moodGen.current === gen) onMood("idle");
        }, Math.min(2400, 400 + reply.length * 18));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "First Mate failed");
      onMood("idle");
    } finally {
      setBusy(false);
      setVoiceArmed(false);
      handingOff.current = false;
    }
  };

  const toggleListen = () => {
    if (mood === "listening") {
      listenRef.current?.stop();
      listenRef.current = null;
      onMood("idle");
      return;
    }
    if (!canListen()) {
      setError("Voice listen needs a browser that supports speech recognition (Chrome or Edge).");
      return;
    }
    setError("");
    setVoiceArmed(true);
    onMood("listening");
    listenRef.current = startListening({
      onResult: (text) => {
        handingOff.current = true;
        listenRef.current = null;
        void send(text, true);
      },
      onEnd: () => {
        listenRef.current = null;
        if (!handingOff.current) onMood("idle");
      },
    });
  };

  if (!open) return null;

  return (
    <div className="relative z-20 mx-auto max-w-6xl px-4 pb-4">
      <GlassPanel title="First Mate" meta={mood} accent={ACCENT} index={0}>
        <p className="text-sm text-white/55">
          The lattice at the centre. Type a log, or talk — First Mate files it on the right world and
          answers.
        </p>
        <div
          ref={listRef}
          className="mt-4 max-h-56 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/35 p-3"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-white/40">
              Nothing on the log yet. Try “oats 420 kcal, ran 30 min, slept 7.5h”.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                <p
                  className="inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "rgba(122, 240, 255, 0.12)", color: "#EAF7FF" }
                      : { background: "rgba(196, 181, 255, 0.14)", color: "#F4F0FF" }
                  }
                >
                  {m.text}
                </p>
              </div>
            ))
          )}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft, voiceArmed);
            }
          }}
          rows={2}
          placeholder="Tell First Mate what happened…"
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <ShimmerButton
            tone={ACCENT}
            disabled={busy || !draft.trim()}
            onClick={() => void send(draft, false)}
          >
            {busy ? "Thinking…" : "Send"}
          </ShimmerButton>
          <ShimmerButton
            tone="#C4B5FF"
            variant={mood === "listening" ? "solid" : "ghost"}
            disabled={busy}
            onClick={toggleListen}
          >
            {mood === "listening" ? "Listening…" : "Talk"}
          </ShimmerButton>
          <ShimmerButton tone="#FF4D6D" variant="ghost" onClick={onClose}>
            Close
          </ShimmerButton>
        </div>
      </GlassPanel>
    </div>
  );
}
