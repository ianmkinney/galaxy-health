import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// When this is true the shell must still be fully usable: planets sit at fixed
// positions, warp becomes a plain fade, and nothing loops.
export const useReducedMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    const apply = (value) => {
      if (mounted) setReduceMotion(Boolean(value));
    };

    AccessibilityInfo.isReduceMotionEnabled?.().then(apply).catch(() => apply(false));
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', apply);

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
};

export default useReducedMotion;
