"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { countTestRows } from "@/lib/test-data";
import { galaxyPopulation } from "@/lib/civilization";
import { normalizeStore } from "@/lib/galaxy-types";

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function CopyBlock({
  label,
  value,
  accent = "#A98BFF",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
        <ShimmerButton
          tone={accent}
          variant="ghost"
          className="!px-3 !py-1.5 text-xs"
          onClick={async () => {
            await copyText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </ShimmerButton>
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] leading-relaxed text-violet-100/90">
        {value}
      </pre>
    </div>
  );
}

export function FirstMatePanel() {
  const { store, refresh, saving } = useGalaxy();
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const phone = store.firstMate?.phone ?? "";
  const consent = store.firstMate?.smsConsent ?? "none";

  useEffect(() => {
    void fetch("/api/first-mate")
      .then((res) => res.json())
      .then((data) => {
        if (data.twilioNumber) setTwilioNumber(data.twilioNumber);
      })
      .catch(() => undefined);
  }, []);

  const consentLabel =
    consent === "opted_in"
      ? "Opted in"
      : consent === "pending"
        ? "Waiting for YES"
        : consent === "opted_out"
          ? "Opted out"
          : "Not opted in";

  return (
    <GlassPanel title="First Mate" accent="#7AF0FF" index={0}>
      <p className="text-sm text-white/55">
        First Mate is the neural mass at the centre of the galaxy. Click it on the Bridge, talk, or
        opt in to SMS. Consent is never pre-checked; we wait for YES before health-log replies.
      </p>
      {twilioNumber ? (
        <p className="mt-2 text-xs text-cyan-200/80">Text First Mate at {twilioNumber}</p>
      ) : (
        <p className="mt-2 text-xs text-white/40">
          Set TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, and TWILIO_AUTH_TOKEN on the web host, then
          paste the SMS webhook from Agent uplink into Twilio.
        </p>
      )}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-white/40">
        SMS {consentLabel}
        {phone ? ` · ${phone}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ShimmerButton tone="#7AF0FF" href="/sms">
          Open SMS opt-in
        </ShimmerButton>
        {phone ? (
          <ShimmerButton
            tone="#FF4D6D"
            variant="ghost"
            disabled={saving}
            onClick={async () => {
              setMsg("");
              try {
                const res = await fetch("/api/first-mate", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone: null }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not unlink");
                setMsg("Phone unlinked. Reply STOP on that handset if texts are still arriving.");
                await refresh({ quiet: true });
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Could not unlink");
              }
            }}
          >
            Unlink phone
          </ShimmerButton>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-white/40">
        <a href="/privacy" className="text-cyan-200/80 hover:underline">
          Privacy
        </a>
        {" · "}
        <a href="/terms" className="text-cyan-200/80 hover:underline">
          Terms
        </a>
        {" · "}
        <a href="/sms/flow" className="text-cyan-200/80 hover:underline">
          Message flow
        </a>
      </p>
      {msg ? <p className="mt-3 text-sm text-white/60">{msg}</p> : null}
    </GlassPanel>
  );
}

export function AgentAccessPanel() {
  const { store, refresh } = useGalaxy();
  const [token, setToken] = useState<string | null>(null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [exampleGet, setExampleGet] = useState("");
  const [firstMateSmsUrl, setFirstMateSmsUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mint = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agent/token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setToken(data.token);
      setAgentPrompt(data.agentPrompt || "");
      setExampleGet(data.examples?.get || "");
      setFirstMateSmsUrl(data.firstMateSmsUrl || "");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Agent uplink" accent="#A98BFF" index={0}>
      <p className="text-sm text-white/55">
        Generate a token, then copy the instructions below and paste them into Cursor, Claude,
        ChatGPT, or any agent. After that, just talk normally — meals, workouts, sleep, labs —
        and the agent will hit Galaxy Health for you.
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

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/60">
        <li>Tap Generate agent token (shown once).</li>
        <li>Copy “Paste this to your agent”.</li>
        <li>Paste into your agent chat and send a health update.</li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton tone="#A98BFF" disabled={busy} onClick={mint}>
          {busy ? "Minting…" : store.agent?.token ? "Regenerate token" : "Generate agent token"}
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
                setAgentPrompt("");
                setExampleGet("");
                setFirstMateSmsUrl("");
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

      {token && agentPrompt ? (
        <div className="mt-5 space-y-4">
          <CopyBlock label="Paste this to your agent" value={agentPrompt} />
          <CopyBlock label="Token only (keep secret)" value={token} accent="#FF8A3D" />
          {firstMateSmsUrl ? (
            <CopyBlock
              label="Twilio SMS webhook (First Mate)"
              value={firstMateSmsUrl}
              accent="#7AF0FF"
            />
          ) : null}
          {exampleGet ? (
            <CopyBlock label="One-shot example URL" value={exampleGet} accent="#4CE0FF" />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/45">
          The ready-to-paste agent instructions appear here after you generate a token. Regenerating
          replaces the previous token immediately.
        </p>
      )}
    </GlassPanel>
  );
}

export function DriveStoragePanel() {
  const [count, setCount] = useState<number | null>(null);
  const [files, setFiles] = useState<
    { id: string; name: string; size: number | null; modifiedTime: string | null }[]
  >([]);
  const [note, setNote] = useState("");
  const [driveUrl, setDriveUrl] = useState("https://drive.google.com/drive/my-drive");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/drive");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load Drive files");
      setCount(data.count ?? 0);
      setFiles(data.files || []);
      setNote(data.appDataNote || "");
      setDriveUrl(data.driveHomeUrl || "https://drive.google.com/drive/my-drive");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Drive files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <GlassPanel
      title="View in Google Drive"
      meta={count == null ? undefined : `${count}`}
      accent="#F5C542"
      index={0}
    >
      <p className="text-sm text-white/55">
        {note ||
          "Galaxy Health keeps your health store in Google Drive’s private app folder for this app."}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">Files stored</div>
          <div className="text-3xl font-black text-amber-200">
            {loading ? "…" : error ? "—" : count}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShimmerButton tone="#F5C542" variant="ghost" disabled={loading} onClick={load}>
            Refresh count
          </ShimmerButton>
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: "#F5C54288", color: "#F5C542" }}
          >
            Open Google Drive
          </a>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && files.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-white/65">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2"
            >
              <span className="truncate font-medium text-white/85">{f.name}</span>
              <span className="shrink-0 text-[11px] text-white/35">
                {f.size != null ? `${Math.max(1, Math.round(f.size / 1024))} KB` : "—"}
                {f.modifiedTime
                  ? ` · ${new Date(f.modifiedTime).toLocaleDateString()}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[11px] text-white/35">
        App-folder files stay private to Galaxy Health and usually do not appear in My Drive folders.
        Opening Drive lets you manage Google account storage; this panel is the live file inventory.
      </p>
    </GlassPanel>
  );
}

export function TestDataPanel() {
  const { hydrate, store } = useGalaxy();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const testRows = countTestRows(store);
  const pop = galaxyPopulation(store);

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
      if (data.store) hydrate(normalizeStore(data.store));
      const nextPop = galaxyPopulation(normalizeStore(data.store ?? store));
      setMsg(
        action === "seed"
          ? `Seeded healthy civilization data (${data.testRows} test rows, population ${nextPop}).`
          : `Cleared test data (${data.testRows} test rows left, population ${nextPop}).`
      );
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
        are tagged and can be removed without touching your real logs. Population and buildings
        update as soon as the rows change.
      </p>
      <p className="mt-2 text-xs text-white/40">
        {testRows} test-tagged rows on file · live population {pop}
      </p>
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
