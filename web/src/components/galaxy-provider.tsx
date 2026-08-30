"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyStore,
  totalsForDay,
  type GalaxyStore,
  type PlanetId,
} from "@/lib/galaxy-types";
import { todayKey } from "@/lib/utils";

type GalaxyContextValue = {
  store: GalaxyStore;
  loading: boolean;
  error: string | null;
  saving: boolean;
  refresh: () => Promise<void>;
  save: (next: GalaxyStore) => Promise<void>;
  update: (mutator: (draft: GalaxyStore) => GalaxyStore) => Promise<void>;
  planetName: (id: PlanetId) => string;
  totals: ReturnType<typeof totalsForDay>;
  inFlight: GalaxyStore["signals"];
};

const GalaxyContext = createContext<GalaxyContextValue | null>(null);

export function GalaxyProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<GalaxyStore>(emptyStore);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load data");
      }
      const data = (await response.json()) as GalaxyStore;
      setStore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (next: GalaxyStore) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      const saved = (await response.json()) as GalaxyStore;
      setStore(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const update = useCallback(
    async (mutator: (draft: GalaxyStore) => GalaxyStore) => {
      const next = mutator(structuredClone(store));
      setStore(next);
      await save(next);
    },
    [save, store]
  );

  const value = useMemo<GalaxyContextValue>(
    () => ({
      store,
      loading,
      error,
      saving,
      refresh,
      save,
      update,
      planetName: (id) => store.planets.find((p) => p.id === id)?.name ?? id,
      totals: totalsForDay(store, todayKey()),
      inFlight: store.signals.filter((s) => !s.seen),
    }),
    [store, loading, error, saving, refresh, save, update]
  );

  return (
    <GalaxyContext.Provider value={value}>{children}</GalaxyContext.Provider>
  );
}

export function useGalaxy() {
  const ctx = useContext(GalaxyContext);
  if (!ctx) throw new Error("useGalaxy must be used within GalaxyProvider");
  return ctx;
}
