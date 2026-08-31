"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { DEFAULT_AI, type AiSettings } from "@/lib/galaxy-types";
import {
  DEFAULT_MODELS,
  fallbackModels,
  type ProviderId,
  type ProviderModel,
} from "@/lib/ai-client";

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "OpenAI" },
  { id: "xai", label: "Grok" },
  { id: "gemini", label: "Gemini" },
];

export function ByokPanel({ index = 2 }: { index?: number }) {
  const { store, update, saving } = useGalaxy();
  const [provider, setProvider] = useState<ProviderId>(store.ai.provider);
  const [model, setModel] = useState(store.ai.model);
  const [keyDraft, setKeyDraft] = useState("");
  const [status, setStatus] = useState("");
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [listing, setListing] = useState(false);
  const [modelsError, setModelsError] = useState("");

  const hasKey = Boolean(store.ai.keys[provider]);

  const refreshModels = useCallback(
    async ({ apiKey, currentModel }: { apiKey?: string; currentModel?: string } = {}) => {
      const selected = currentModel || model;
      setListing(true);
      setModelsError("");
      try {
        const res = await fetch("/api/ai/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });
        const data = await res.json();
        const list: ProviderModel[] = Array.isArray(data.models)
          ? data.models
          : fallbackModels(provider);
        setModels(list);
        if (data.notice) setModelsError(data.notice);
        if (data.error && !list.length) setModelsError(data.error);
        const stillValid = list.some((item) => item.id === selected);
        if (!stillValid && list[0]) {
          setModel(list[0].id);
          await update((d) => {
            d.ai.provider = provider;
            d.ai.model = list[0].id;
            return d;
          });
        }
      } catch (error) {
        setModels(fallbackModels(provider));
        setModelsError(error instanceof Error ? error.message : "Could not list models");
      } finally {
        setListing(false);
      }
    },
    [model, provider, update]
  );

  useEffect(() => {
    if (!hasKey) {
      setModels([]);
      setModelsError("");
      return;
    }
    void refreshModels({
      currentModel: store.ai.provider === provider ? store.ai.model : DEFAULT_MODELS[provider],
    });
    // List when the provider or saved key changes — not on every model pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, hasKey]);

  const pickModel = async (id: string) => {
    setModel(id);
    await update((d) => {
      d.ai.provider = provider;
      d.ai.model = id;
      return d;
    });
    setStatus(`Model set to ${id}`);
  };

  const shown = models.length ? models : hasKey ? fallbackModels(provider) : [];

  return (
    <GlassPanel title="Bring your own key" accent="#4CE0FF" index={index}>
      <p className="text-sm text-white/55">
        Same idea as Food Dude: your Claude / OpenAI / Grok / Gemini key stays in{" "}
        <em>your</em> Google Drive app folder. Galaxy Health has no key server. A key also powers
        intelligent agent routing. After you save a key, every chat model for that provider is
        listed here.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PROVIDERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setProvider(item.id);
              setKeyDraft("");
              setStatus("");
              setModel(
                store.ai.provider === item.id ? store.ai.model : DEFAULT_MODELS[item.id]
              );
            }}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${
              provider === item.id
                ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                : "border-white/15 text-white/60"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/40">
        {hasKey ? `Key on file for ${provider}.` : `No key saved for ${provider} yet.`}
      </p>
      <input
        type="password"
        value={keyDraft}
        onChange={(e) => setKeyDraft(e.target.value)}
        placeholder="Paste API key"
        autoComplete="off"
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton
          tone="#4CE0FF"
          disabled={saving || !keyDraft.trim()}
          onClick={async () => {
            const trimmed = keyDraft.trim();
            await update((d) => {
              d.ai.provider = provider;
              d.ai.model = model || DEFAULT_MODELS[provider] || DEFAULT_AI.model;
              d.ai.keys[provider] = trimmed;
              return d;
            });
            setKeyDraft("");
            setStatus("Key saved to Drive app data. Listing models…");
            await refreshModels({ apiKey: trimmed, currentModel: model });
            setStatus("Key saved. Pick a model below.");
          }}
        >
          Save key
        </ShimmerButton>
        <ShimmerButton
          tone="#4CE0FF"
          variant="ghost"
          disabled={saving}
          onClick={async () => {
            await update((d) => {
              d.ai.provider = provider;
              d.ai.model = model || DEFAULT_MODELS[provider] || DEFAULT_AI.model;
              return d;
            });
            setStatus("Provider updated.");
            if (hasKey) await refreshModels({ currentModel: model });
          }}
        >
          Set provider
        </ShimmerButton>
        {hasKey ? (
          <ShimmerButton
            tone="#FF4D6D"
            variant="ghost"
            onClick={async () => {
              await update((d) => {
                delete d.ai.keys[provider];
                return d;
              });
              setModels([]);
              setModelsError("");
              setStatus("Key cleared.");
            }}
          >
            Clear key
          </ShimmerButton>
        ) : null}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
            Models
          </p>
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {listing ? "listing…" : shown.length ? `${shown.length}` : ""}
          </span>
        </div>
        {!hasKey ? (
          <p className="text-sm text-white/45">
            Save a key to list live models from {provider}.
          </p>
        ) : (
          <>
            <ShimmerButton
              tone="#4CE0FF"
              variant="ghost"
              disabled={listing || saving}
              onClick={() => refreshModels({ currentModel: model })}
            >
              {listing ? "Refreshing…" : "Refresh models"}
            </ShimmerButton>
            {modelsError ? (
              <p className="mt-2 text-xs text-amber-200/80">{modelsError}</p>
            ) : null}
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {shown.map((item) => {
                const selected = item.id === model;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickModel(item.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
                        : "border-white/10 bg-black/20 text-white/80 hover:border-white/25"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.name || item.id}</span>
                      {item.name && item.name !== item.id ? (
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-white/40">
                          {item.id}
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                        Active
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {status ? <p className="mt-3 text-sm text-white/50">{status}</p> : null}
    </GlassPanel>
  );
}
