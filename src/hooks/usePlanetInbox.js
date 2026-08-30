import { useCallback, useEffect, useState } from 'react';

import { signalsRepo } from '../db/repositories';
import { useGalaxy } from '../state/GalaxyContext';
import { EVENTS, on } from '../state/eventBus';

// Arriving at a planet lands every ship bound for it, then reads the inbox.
// This is why the Bridge stops drawing those ships: they were delivered.
export const usePlanetInbox = (planetId) => {
  const { collectSignals } = useGalaxy();
  const [signals, setSignals] = useState([]);

  const load = useCallback(async () => {
    const rows = await signalsRepo.inboxFor(planetId);
    setSignals(rows);
  }, [planetId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await collectSignals(planetId);
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [collectSignals, load, planetId]);

  useEffect(() => on(EVENTS.DATA_CHANGED, () => load()), [load]);

  return { signals, reload: load };
};

export default usePlanetInbox;
