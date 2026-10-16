// MyPhoto design system: calm neutral ground, one brand blue, orange only
// for Meme Wall. Screen titles use Bricolage Grotesque (fonts.display).
export const lightColors = {
  primary: '#2453E6',
  primaryLight: '#EAF0FF',
  primaryDark: '#1A3FB8',
  accent: '#FF7A3D',
  accentLight: '#FFB38A',
  accentDark: '#E8590C',
  success: '#16A34A',
  error: '#D42F3A',
  warning: '#D97706',

  bg: '#FAFAF8',
  bgCard: '#FFFFFF',
  bgInput: '#F0F0EC',

  text: '#16181D',
  textSecondary: '#5E6470',
  textMuted: '#8A909B',
  textWhite: '#FFFFFF',

  border: '#E7E7E3',
  borderLight: '#F2F2EE',

  tabInactive: '#5E6470',
  tabActive: '#2453E6',
};

export const darkColors: typeof lightColors = {
  // White text on it ~4.3:1 and it reads ~4.4:1 on the dark ground.
  primary: '#4A6FFA',
  primaryLight: '#1C2647',
  primaryDark: '#2453E6',
  accent: '#FF7A3D',
  accentLight: '#FFB38A',
  accentDark: '#E8590C',
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',

  bg: '#111214',
  bgCard: '#1B1D21',
  bgInput: '#26292F',

  text: '#F2F2F0',
  textSecondary: '#A3A7B0',
  textMuted: '#7A7F89',
  textWhite: '#FFFFFF',

  border: '#2C2F36',
  borderLight: '#1F2125',

  tabInactive: '#A3A7B0',
  tabActive: '#7B98FF',
};

/** Meme Wall's own color: the flame stays orange on every screen. */
export const memeFlame = '#FF7A3D';

// Default export for backward compatibility (screens that import `colors` directly)
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const fonts = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
  extrabold: { fontWeight: '800' as const },
  // Loaded in app/_layout.tsx; falls back to the system font until then.
  display: { fontFamily: 'BricolageGrotesque_700Bold' },
  displayHeavy: { fontFamily: 'BricolageGrotesque_800ExtraBold' },
} as const;
