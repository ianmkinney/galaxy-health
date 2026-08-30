"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { countTestRows } from "@/lib/test-data";

export function AgentAccessPanel() {
  const { store, refresh } = useGalaxy();
  const [token, setToken] = useState<string | null>(null);
  const [example, setExample] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <GlassPanel title="Agent uplink URL" accent="#A98BFF" index={0}>
      <p className="text-sm text-white/55">
        Generate a secret token so Cursor, Claude, ChatGPT Actions, or any agent can hit a URL and
        log free-form updates. Galaxy Health routes the text into the right planets.
      </p>
      <p className="mt-2 text-xs text-white/40">
        {store.agent?.token
          ? `Active token id …${store.agent.token.slice(-6)} · created ${
              store.agent.created_at
                ? new Date(store.agent.created_at).toLocaleString()
                : "—"
            }`
          : "No agent token yet."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton
          tone="#A98BFF"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const res = await fetch("/api/agent/token", { method: "POST" });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed");
              setToken(data.token);
              setExample(data.examples?.get || "");
              await refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Minting…" : "Generate agent token"}
        </ShimmerButton>
        {store.agent?.token ? (
          <ShimmerButton
            tone="#FF4D6D"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await fetch("/api/agent/token", { method: "DELETE" });
                setToken(null);
                setExample("");
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            Revoke
          </ShimmerButton>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {token ? (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Copy once — shown only now
          </p>
          <code className="block break-all rounded-xl border border-violet-300/20 bg-black/50 p-3 text-[11px] text-violet-100">
            {token}
          </code>
          {example ? (
            <code className="block break-all rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
              {example}
            </code>
          ) : null}
        </div>
      ) : null}
    </GlassPanel>
  );
}

export function TestDataPanel() {
  const { refresh, store } = useGalaxy();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const testRows = countTestRows(store);

  const run = async (action: "seed" | "clear") => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(
        action === "seed"
          ? `Seeded healthy civilization data (${data.testRows} test rows).`
          : `Cleared test data (${data.testRows} remaining).`
      );
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Test civilization" accent="#3DDC97" index={0}>
      <p className="text-sm text-white/55">
        Populate every planet with a healthy 7-day sample so charts and ships light up. Test rows
        are tagged and can be removed without touching your real logs.
      </p>
      <p className="mt-2 text-xs text-white/40">{testRows} test-tagged rows on file.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton tone="#3DDC97" disabled={busy} onClick={() => run("seed")}>
          Populate healthy test data
        </ShimmerButton>
        <ShimmerButton tone="#FF4D6D" variant="ghost" disabled={busy} onClick={() => run("clear")}>
          Remove test data
        </ShimmerButton>
      </div>
      {msg ? <p className="mt-3 text-sm text-white/60">{msg}</p> : null}
    </GlassPanel>
  );
}
