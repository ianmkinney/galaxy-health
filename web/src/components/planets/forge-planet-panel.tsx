"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area, Field } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import {
  applyForgePlanet,
  coercePlanetDraft,
  emptyPlanetTemplate,
  heuristicPlanet,
  type ForgePlanetDraft,
} from "@/lib/world-forge";

function TemplatePreview({ draft }: { draft: ForgePlanetDraft }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
        Setup template
      </p>
      <p className="mt-1 text-sm text-white">
        {draft.name} · {draft.domain}
      </p>
      <p className="text-xs text-white/45">
        {draft.vibe} · {draft.cadence}
      </p>
      <ul className="mt-3 space-y-2">
        {draft.systems.map((system) => (
          <li key={`${system.name}-${system.building_kind}`} className="rounded-lg border border-white/10 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/85">
              {system.name}
            </div>
            <div className="text-[11px] text-white/40">
              {system.building_name} · {system.fields.map((field) => field.label).join(" · ")}
            </div>
            {system.description ? (
              <p className="mt-1 text-[11px] text-white/45">{system.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ForgePlanetPanel({ index = 3 }: { index?: number }) {
  const router = useRouter();
  const { store, save, saving } = useGalaxy();
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState<ForgePlanetDraft>(() => emptyPlanetTemplate());
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const fillFromContext = async (description: string) => {
    let next = heuristicPlanet(description);
    let via: "ai" | "local" = "local";
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forge.planet", message: description }),
      });
      const data = await res.json();
      if (data.forge) {
        next = coercePlanetDraft(data.forge, description);
        via = data.via === "ai" ? "ai" : "local";
      }
    } catch {
      via = "local";
    }
    return { next, via };
  };

  const fillTemplate = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { next, via } = await fillFromContext(description);
      setDraft(next);
      setFilled(true);
      setNotice(
        via === "ai"
          ? `Template filled: ${next.systems.length} tracking systems from your context.`
          : "Template filled locally from your context. Add an API key in Settings for a richer AI fill."
      );
    } finally {
      setBusy(false);
    }
  };

  const raise = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError("");
    try {
      let ready = draft;
      let via: "ai" | "local" = "local";
      if (!filled) {
        const filledDraft = await fillFromContext(description);
        ready = filledDraft.next;
        via = filledDraft.via;
        setDraft(ready);
        setFilled(true);
      }
      const { store: next, id } = applyForgePlanet(store, ready, description, "user");
      await save(next);
      setNotice(
        via === "ai" || filled
          ? `${ready.name} is in orbit with ${ready.systems.length} buildings.`
          : `${ready.name} stood up from your context.`
      );
      setBrief("");
      setDraft(emptyPlanetTemplate());
      setFilled(false);
      router.push(`/world/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise this world.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Add a planet" accent="#4CE0FF" index={index}>
      <p className="text-sm text-white/55">
        Every new world starts from the same setup template (primary log, measure, archive). AI
        specializes those tracking systems from the context you provide.
      </p>
      <div className="mt-3">
        <Area
          label="Context — what should this world track?"
          value={brief}
          onChange={(value) => {
            setBrief(value);
            setFilled(false);
          }}
          rows={4}
          accent="cyan"
        />
      </div>
      {filled ? (
        <div className="mt-3">
          <Field label="Planet name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        </div>
      ) : null}
      <TemplatePreview draft={draft} />
      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton
          tone="#4CE0FF"
          variant="ghost"
          disabled={busy || saving || !brief.trim()}
          onClick={fillTemplate}
        >
          {busy && !filled ? "Filling…" : "Fill template with AI"}
        </ShimmerButton>
        <ShimmerButton tone="#4CE0FF" disabled={busy || saving || !brief.trim()} onClick={raise}>
          {busy ? "Raising…" : "Raise planet"}
        </ShimmerButton>
      </div>
      {notice ? <p className="mt-3 text-sm text-cyan-100/80">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
