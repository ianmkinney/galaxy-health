// Galaxy Health design system.
// Deep-space first. Every planet owns an accent ramp; the shell owns the void.

export const palette = {
  void: {
    900: '#03050B',
    800: '#05070F',
    700: '#090D1A',
    600: '#101728',
    500: '#18213A',
    400: '#243050',
    300: '#35446B',
    200: '#4E5F88',
  },
  ink: {
    50: '#F4F8FF',
    100: '#DCE6FA',
    200: '#B4C4E4',
    300: '#8B9CC0',
    400: '#64769B',
    500: '#465577',
  },
  plasma: {
    50: '#EEF9FF',
    100: '#CFF2FF',
    200: '#9FE7FF',
    300: '#6FDBFF',
    400: '#4CE0FF',
    500: '#22C8F5',
    600: '#0FA3D0',
    700: '#0B7CA1',
    800: '#095F7C',
    900: '#07485D',
  },
  status: {
    good: '#4FE0A8',
    warn: '#FFC55C',
    bad: '#FF5C7A',
    info: '#6FDBFF',
  },
};

// Planet accents. Keys are the stable planet ids — never display names.
export const planetAccents = {
  galley: {
    core: '#FFC98A',
    mid: '#FF8A3D',
    deep: '#B4441A',
    glow: 'rgba(255, 138, 61, 0.45)',
    ink: '#FFE3C7',
  },
  atlas: {
    core: '#FF9AAE',
    mid: '#FF4D6D',
    deep: '#8E1733',
    glow: 'rgba(255, 77, 109, 0.45)',
    ink: '#FFD5DD',
  },
  lumen: {
    core: '#BFF4FF',
    mid: '#4CE0FF',
    deep: '#0B6E8E',
    glow: 'rgba(76, 224, 255, 0.45)',
    ink: '#D6F7FF',
  },
  observatory: {
    core: '#DCCEFF',
    mid: '#A98BFF',
    deep: '#4B2E9E',
    glow: 'rgba(169, 139, 255, 0.45)',
    ink: '#EAE2FF',
  },
};

export const starColor = {
  core: '#FFF7DC',
  mid: '#FFD98A',
  deep: '#FF9C3D',
  glow: 'rgba(255, 205, 130, 0.5)',
};

const themes = {
  dark: {
    background: palette.void[800],
    backgroundDeep: palette.void[900],
    surface: 'rgba(16, 23, 40, 0.82)',
    surfaceRaised: 'rgba(36, 48, 80, 0.86)',
    surfaceSunken: 'rgba(3, 5, 11, 0.6)',
    hull: '#0A0F1C',
    hullEdge: '#1E2A47',
    border: 'rgba(111, 219, 255, 0.18)',
    borderStrong: 'rgba(111, 219, 255, 0.38)',
    grid: 'rgba(111, 219, 255, 0.08)',
    text: {
      primary: palette.ink[50],
      secondary: palette.ink[200],
      tertiary: palette.ink[400],
      inverse: palette.void[900],
    },
    overlay: 'rgba(3, 5, 11, 0.78)',
  },
  // "Daybreak" — a lighter nebula variant so the app is usable in bright light.
  light: {
    background: '#E8ECF7',
    backgroundDeep: '#D6DCEC',
    surface: 'rgba(255, 255, 255, 0.86)',
    surfaceRaised: 'rgba(255, 255, 255, 0.96)',
    surfaceSunken: 'rgba(214, 220, 236, 0.7)',
    hull: '#F3F5FC',
    hullEdge: '#C3CBE2',
    border: 'rgba(11, 124, 161, 0.22)',
    borderStrong: 'rgba(11, 124, 161, 0.45)',
    grid: 'rgba(11, 124, 161, 0.1)',
    text: {
      primary: '#0B1220',
      secondary: '#3C4A66',
      tertiary: '#6C7B99',
      inverse: '#F4F8FF',
    },
    overlay: 'rgba(232, 236, 247, 0.82)',
  },
};

export const typography = {
  sizes: { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, '2xl': 24, '3xl': 30, '4xl': 40 },
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '800' },
  // Uppercase + wide tracking is the HUD voice.
  hud: { letterSpacing: 1.6, fontWeight: '700', textTransform: 'uppercase' },
};

export const spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 };

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, panel: 20, pill: 999 };

const shadow = (color, y, opacity, blur, elevation) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation,
});

export const shadows = {
  none: shadow('transparent', 0, 0, 0, 0),
  panel: shadow('#000000', 10, 0.45, 24, 12),
  lifted: shadow('#000000', 18, 0.5, 34, 20),
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 14,
  }),
};

// One motion vocabulary, consumed by Reanimated on both platforms.
export const motion = {
  duration: {
    instant: 90,
    fast: 160,
    normal: 260,
    slow: 420,
    warp: 720,
    enter: 340,
  },
  stagger: 55,
  spring: {
    press: { damping: 16, stiffness: 380, mass: 0.32 },
    pop: { damping: 12, stiffness: 220, mass: 0.5 },
    settle: { damping: 22, stiffness: 150, mass: 0.7 },
  },
  scale: { press: 0.955, pressHard: 0.92, hover: 1.03 },
  // One shared orbit loop drives the whole system. Revolutions per loop are
  // integers so the scene wraps seamlessly with no visible jump.
  orbit: { loopMs: 420000 },
  signal: { flightMs: 5200, gapMs: 900 },
};

export const getTheme = (isDark = true, platform) => ({
  isDark,
  platform,
  colors: isDark ? themes.dark : themes.light,
  palette,
  planetAccents,
  starColor,
  typography,
  spacing,
  radius,
  shadows,
  motion,
});

// Frosted-hull panel used for every HUD and card surface.
export const panelStyle = (theme, variant = 'panel') => {
  const base = {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.panel,
    ...shadows.panel,
  };

  if (variant === 'raised') {
    return { ...base, backgroundColor: theme.colors.surfaceRaised, ...shadows.lifted };
  }
  if (variant === 'sunken') {
    return {
      ...base,
      backgroundColor: theme.colors.surfaceSunken,
      borderColor: theme.colors.grid,
      ...shadows.none,
    };
  }
  if (variant === 'hud') {
    return {
      ...base,
      borderColor: theme.colors.borderStrong,
      borderRadius: radius.lg,
    };
  }
  return base;
};

export default { getTheme, panelStyle, planetAccents, palette, motion, spacing, radius, typography };
