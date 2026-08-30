"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";

export function AiDock({
  accent,
  title,
  placeholder,
  action,
  onResult,
}: {
  accent: string;
  title: string;
  placeholder: string;
  action: string;
  onResult?: (text: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI failed");
      setReply(data.text);
      onResult?.(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel title={title} accent={accent} index={0}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
      />
      <div className="mt-3">
        <ShimmerButton tone={accent} disabled={loading} onClick={run}>
          {loading ? "Thinking…" : "Ask AI"}
        </ShimmerButton>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {reply ? (
        <pre
          className={cn(
            "mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white/85"
          )}
        >
          {reply}
        </pre>
      ) : null}
    </GlassPanel>
  );
}
