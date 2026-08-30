"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { planetView, type PlanetId } from "@/lib/galaxy-types";
import { applyForgeSystem, coerceSystemDraft, heuristicSystem } from "@/lib/world-forge";

export function AddSystemPanel({ planetId }: { planetId: PlanetId }) {
  const { store, save, saving } = useGalaxy();
  const view = planetView(store, planetId);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const add = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError("");
    setNotice("");
    let via: "ai" | "local" = "local";
    let draft = heuristicSystem(description);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forge.system",
          message: description,
          extra: { planetId, planetName: view.name, domain: view.domain },
        }),
      });
      const data = await res.json();
      if (data.forge) {
        draft = coerceSystemDraft(data.forge, description);
        via = data.via === "ai" ? "ai" : "local";
      }
    } catch {
      via = "local";
    }
    try {
      const { store: next, system } = applyForgeSystem(store, planetId, draft, "user");
      await save(next);
      setBrief("");
      setNotice(
        via === "ai"
          ? `${system.building_name} raised on ${view.name}.`
          : `${system.building_name} raised. Add an API key in Settings for a richer AI system.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this system.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Add tracking system" accent={view.accent} index={0}>
      <p className="text-sm text-white/55">
        A new system raises a new building on {view.name}. Describe what you want to log.
      </p>
      <div className="mt-3">
        <Area
          label="What should this system track?"
          value={brief}
          onChange={setBrief}
          rows={3}
        />
      </div>
      <div className="mt-4">
        <ShimmerButton tone={view.accent} disabled={busy || saving || !brief.trim()} onClick={add}>
          {busy ? "Raising…" : "Raise building"}
        </ShimmerButton>
      </div>
      {notice ? <p className="mt-3 text-sm text-white/70">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
