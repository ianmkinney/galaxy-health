"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";

export function IngestPanel({ accent = "#4CE0FF" }: { accent?: string }) {
  const { refresh } = useGalaxy();
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingest failed");
      setResult(
        `${data.summary}\nApplied ${data.applied} · planets: ${(data.planetsTouched || []).join(", ") || "—"} · mode: ${data.mode}`
      );
      setText("");
      await refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel title="Civilization uplink" accent={accent} index={0}>
      <p className="text-sm text-white/55">
        Paste anything — meals, workouts, sleep, labs, groceries. Intelligent routing writes the
        right planet logs, launches ships, and grows the colony.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Example: Breakfast oats 420 kcal 18g protein, ran 32 min, slept 7.5h, feeling focused"
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
      />
      <div className="mt-3">
        <ShimmerButton tone={accent} disabled={loading || !text.trim()} onClick={run}>
          {loading ? "Routing…" : "Update planets"}
        </ShimmerButton>
      </div>
      {result ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
          {result}
        </pre>
      ) : null}
    </GlassPanel>
  );
}
