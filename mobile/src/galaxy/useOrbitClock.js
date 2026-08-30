import { useEffect } from 'react';
import { Easing, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';

import { motion } from '../theme';

// One linear 0..1 driver for the entire system.
//
// Each planet's revolutions-per-loop is a whole number, so when the driver wraps
// every body is exactly back where it started. That means the whole solar system
// is a single Reanimated animation running on the UI thread — no per-frame
// callback, no JS work, and no drift between planets and the ships flying
// between them.
export const useOrbitClock = (enabled = true) => {
  const clock = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(clock);
      // Park the system at a composed, non-overlapping arrangement.
      clock.value = 0.12;
      return undefined;
    }

    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: motion.orbit.loopMs, easing: Easing.linear }),
      -1,
      false
    );

    return () => cancelAnimation(clock);
  }, [clock, enabled]);

  return clock;
};

export default useOrbitClock;
