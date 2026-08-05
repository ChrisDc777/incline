/**
 * Accent / brand themes. Primary drives CTAs, tabs, focus rings.
 * Success stays emerald across themes so "set complete" stays familiar.
 *
 * CSS class: `theme-${id}` on the root (see global.css).
 * Hex maps stay in sync for charts, Switch, ActivityIndicator, icons.
 */

import type { AccentTheme } from '@/db/types';

export type { AccentTheme };

export interface AccentDefinition {
  id: AccentTheme;
  label: string;
  description: string;
  /** Tailwind-friendly HSL channels without `hsl()` wrapper: "H S% L%" */
  light: { primary: string; ring: string; chart1: string };
  dark: { primary: string; ring: string; chart1: string };
  /** Hex for native props */
  hex: { light: string; dark: string };
}

export const ACCENT_THEMES: Record<AccentTheme, AccentDefinition> = {
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    description: 'Electric indigo — default Incline brand',
    light: { primary: '246 90% 66%', ring: '246 90% 66%', chart1: '246 80% 60%' },
    dark: { primary: '246 85% 72%', ring: '246 85% 72%', chart1: '246 75% 68%' },
    hex: { light: '#6D5DF6', dark: '#8B7CFF' },
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    description: 'Athletic teal without gym-green cliché',
    light: { primary: '173 80% 32%', ring: '173 80% 32%', chart1: '173 70% 38%' },
    dark: { primary: '172 66% 50%', ring: '172 66% 50%', chart1: '172 60% 52%' },
    hex: { light: '#0D9488', dark: '#2DD4BF' },
  },
  copper: {
    id: 'copper',
    label: 'Copper',
    description: 'Warm energy on cool neutrals',
    light: { primary: '32 80% 57%', ring: '32 80% 57%', chart1: '32 75% 52%' },
    dark: { primary: '32 85% 62%', ring: '32 85% 62%', chart1: '32 80% 58%' },
    hex: { light: '#E8943A', dark: '#F0A85A' },
  },
  coral: {
    id: 'coral',
    label: 'Coral',
    description: 'High-energy accent (distinct from destructive)',
    light: { primary: '0 100% 68%', ring: '0 100% 68%', chart1: '0 85% 62%' },
    dark: { primary: '0 90% 72%', ring: '0 90% 72%', chart1: '0 80% 68%' },
    hex: { light: '#FF6B6B', dark: '#FF8585' },
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    description: 'Classic fitness green (for comparison)',
    light: { primary: '142 69% 45%', ring: '142 69% 45%', chart1: '142 64% 45%' },
    dark: { primary: '142 69% 47%', ring: '142 69% 47%', chart1: '142 64% 48%' },
    hex: { light: '#16a34a', dark: '#22c55e' },
  },
};

export const ACCENT_THEME_LIST = Object.values(ACCENT_THEMES);

export const DEFAULT_ACCENT_THEME: AccentTheme = 'indigo';

export function isAccentTheme(value: unknown): value is AccentTheme {
  return typeof value === 'string' && value in ACCENT_THEMES;
}
