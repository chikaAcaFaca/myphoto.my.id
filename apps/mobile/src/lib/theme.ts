// Sync-Swift Design System
export const lightColors = {
  primary: '#0ea5e9',
  primaryLight: '#38bdf8',
  primaryDark: '#0284c7',
  accent: '#f97316',
  accentLight: '#fb923c',
  accentDark: '#ea580c',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',

  bg: '#f8fafc',
  bgCard: '#ffffff',
  bgInput: '#f1f5f9',

  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textWhite: '#ffffff',

  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  tabInactive: '#94a3b8',
  tabActive: '#0ea5e9',
} as const;

export const darkColors: typeof lightColors = {
  primary: '#38bdf8',
  primaryLight: '#7dd3fc',
  primaryDark: '#0ea5e9',
  accent: '#fb923c',
  accentLight: '#fdba74',
  accentDark: '#f97316',
  success: '#4ade80',
  error: '#f87171',
  warning: '#fbbf24',

  bg: '#0f172a',
  bgCard: '#1e293b',
  bgInput: '#334155',

  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textWhite: '#ffffff',

  border: '#334155',
  borderLight: '#1e293b',

  tabInactive: '#64748b',
  tabActive: '#38bdf8',
} as const;

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
} as const;
