import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { initDatabase, purgeLogs } from '../db/client';
import {
  atlasRepo,
  galleyRepo,
  lumenRepo,
  observatoryRepo,
  planetsRepo,
  settingsRepo,
  signalsRepo,
  todayKey,
} from '../db/repositories';
import { PLANETS, PLANET_IDS } from '../galaxy/planets';
import { SIGNAL_ROUTES } from './signalKinds';
import { EVENTS, emit, on } from './eventBus';

const GalaxyContext = createContext(null);

const EMPTY_SNAPSHOT = {
  galley: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 },
  atlas: { minutes: 0, burn: 0, intensity: 0, entries: 0 },
  lumen: { mood: 0, focus: 0, sleep: 0, entries: 0 },
  observatory: { markers: 0 },
};

export const GalaxyProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [planets, setPlanets] = useState(() =>
    PLANETS.map((planet) => ({ ...planet, name: planet.defaultName, enabled: true }))
  );
  const [settings, setSettings] = useState({});
  const [inFlight, setInFlight] = useState([]);
  const [totals, setTotals] = useState(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    const day = todayKey();
    const [planetRows, settingRows, pending, galley, atlas, lumen, markerCount] = await Promise.all([
      planetsRepo.list(),
      settingsRepo.all(),
      signalsRepo.inFlight(),
      galleyRepo.totalsForDay(day),
      atlasRepo.totalsForDay(day),
      lumenRepo.totalsForDay(day),
      observatoryRepo.count(),
    ]);

    setPlanets(planetRows);
    setSettings(settingRows);
    setInFlight(pending);
    setTotals({ galley, atlas, lumen, observatory: { markers: markerCount } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        if (cancelled) return;
        await refresh();
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error('[galaxy] init failed', e);
        if (!cancelled) setError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Any planet screen that writes data emits DATA_CHANGED; the shell re-reads.
  useEffect(() => {
    if (!ready) return undefined;
    return on(EVENTS.DATA_CHANGED, () => {
      refresh().catch((e) => console.warn('[galaxy] refresh failed', e));
    });
  }, [ready, refresh]);

  // The single entry point for cross-planet traffic. Route comes from the kind,
  // so a screen can never invent an arc that the Bridge cannot draw.
  const sendSignal = useCallback(async (kind, payload, payloadRef) => {
    const route = SIGNAL_ROUTES[kind];
    if (!route) throw new Error(`Unknown signal kind: ${kind}`);
    const id = await signalsRepo.send({ ...route, kind, payload, payloadRef });
    emit(EVENTS.SIGNAL_SENT, { id, kind, ...route, payload });
    emit(EVENTS.DATA_CHANGED, { source: route.from });
    return id;
  }, []);

  // Called when the user arrives at a planet: inbound ships land and are read.
  const collectSignals = useCallback(async (planetId) => {
    const delivered = await signalsRepo.markDelivered(planetId);
    if (delivered > 0) {
      emit(EVENTS.SIGNALS_DELIVERED, { planetId, count: delivered });
      emit(EVENTS.DATA_CHANGED, { source: planetId });
    }
    return delivered;
  }, []);

  const renamePlanet = useCallback(
    async (id, name) => {
      await planetsRepo.rename(id, name);
      await refresh();
    },
    [refresh]
  );

  const setPlanetEnabled = useCallback(
    async (id, enabled) => {
      await planetsRepo.setEnabled(id, enabled);
      await refresh();
    },
    [refresh]
  );

  const resetPlanetNames = useCallback(async () => {
    await planetsRepo.resetNames();
    await refresh();
  }, [refresh]);

  const updateSetting = useCallback(
    async (key, value) => {
      await settingsRepo.set(key, value);
      setSettings((prev) => ({ ...prev, [key]: value == null ? null : String(value) }));
    },
    []
  );

  const purge = useCallback(async () => {
    await purgeLogs();
    await refresh();
  }, [refresh]);

  const planetName = useCallback(
    (id) => planets.find((planet) => planet.id === id)?.name ?? id,
    [planets]
  );

  const value = useMemo(
    () => ({
      ready,
      error,
      planets,
      enabledPlanets: planets.filter((planet) => planet.enabled),
      planetName,
      settings,
      inFlight,
      totals,
      refresh,
      sendSignal,
      collectSignals,
      renamePlanet,
      setPlanetEnabled,
      resetPlanetNames,
      updateSetting,
      purge,
    }),
    [
      ready,
      error,
      planets,
      planetName,
      settings,
      inFlight,
      totals,
      refresh,
      sendSignal,
      collectSignals,
      renamePlanet,
      setPlanetEnabled,
      resetPlanetNames,
      updateSetting,
      purge,
    ]
  );

  return <GalaxyContext.Provider value={value}>{children}</GalaxyContext.Provider>;
};

export const useGalaxy = () => {
  const context = useContext(GalaxyContext);
  if (!context) throw new Error('useGalaxy must be used inside GalaxyProvider');
  return context;
};

export { PLANET_IDS };
