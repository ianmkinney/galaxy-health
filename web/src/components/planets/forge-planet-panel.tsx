"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { applyForgePlanet, coercePlanetDraft, heuristicPlanet } from "@/lib/world-forge";

export function ForgePlanetPanel() {
  const router = useRouter();
  const { store, save, saving } = useGalaxy();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const forge = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError("");
    setNotice("");
    let via: "ai" | "local" = "local";
    let draft = heuristicPlanet(description);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forge.planet", message: description }),
      });
      const data = await res.json();
      if (data.forge) {
        draft = coercePlanetDraft(data.forge, description);
        via = data.via === "ai" ? "ai" : "local";
      } else if (!res.ok && !data.forge) {
        via = "local";
      }
    } catch {
      via = "local";
    }
    try {
      const { store: next, id } = applyForgePlanet(store, draft, description, "user");
      await save(next);
      setNotice(
        via === "ai"
          ? `${draft.name} forged with ${draft.systems.length} systems.`
          : `${draft.name} stood up from your brief. Add an API key in Settings for a richer AI forge.`
      );
      setBrief("");
      router.push(`/world/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not forge this world.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Forge a world" accent="#4CE0FF" index={3}>
      <p className="text-sm text-white/55">
        Describe what you want to track. Systems become buildings on a new planet beyond Observatory.
      </p>
      <div className="mt-3">
        <Area
          label="What should this world track?"
          value={brief}
          onChange={setBrief}
          rows={4}
          accent="cyan"
        />
      </div>
      <div className="mt-4">
        <ShimmerButton tone="#4CE0FF" disabled={busy || saving || !brief.trim()} onClick={forge}>
          {busy ? "Forging…" : "Forge planet"}
        </ShimmerButton>
      </div>
      {notice ? <p className="mt-3 text-sm text-cyan-100/80">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
