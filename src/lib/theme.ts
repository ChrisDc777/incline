/**
 * Theme hex tokens for native props that cannot use Tailwind classNames
 * (ActivityIndicator, chart libs, Switch track colors, etc.).
 * Accent primary comes from the selected brand theme; neutrals stay fixed.
 */
import { ACCENT_THEMES, DEFAULT_ACCENT_THEME, type AccentTheme } from '@/lib/accent-themes';
import { useSettings } from '@/store/settings-store';
import { useAppColorScheme } from '@/lib/use-color-scheme';

const NEUTRALS = {
  light: {
    muted: '#e4e4e7',
    mutedForeground: '#71717a',
    foreground: '#09090b',
    background: '#ffffff',
    card: '#ffffff',
    border: '#e4e4e7',
  },
  dark: {
    muted: '#3f3f46',
    mutedForeground: '#a1a1aa',
    foreground: '#fafafa',
    background: '#09090b',
    card: '#09090b',
    border: '#27272a',
  },
} as const;

export type ThemeScheme = 'light' | 'dark';

export function themeHex(
  scheme: ThemeScheme | null | undefined,
  accent: AccentTheme = DEFAULT_ACCENT_THEME,
) {
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const def = ACCENT_THEMES[accent] ?? ACCENT_THEMES[DEFAULT_ACCENT_THEME];
  return {
    ...NEUTRALS[mode],
    primary: def.hex[mode],
  };
}

export function primaryHex(
  scheme: ThemeScheme | null | undefined,
  accent: AccentTheme = DEFAULT_ACCENT_THEME,
): string {
  return themeHex(scheme, accent).primary;
}

/** Primary hex honoring Settings accent + effective color scheme. */
export function usePrimaryHex(): string {
  const scheme = useAppColorScheme();
  const accent = useSettings((s) => s.accentTheme);
  return primaryHex(scheme, accent);
}

/** Full theme hex object for the current accent + scheme. */
export function useThemeHex() {
  const scheme = useAppColorScheme();
  const accent = useSettings((s) => s.accentTheme);
  return themeHex(scheme, accent);
}

/** Convert `#RRGGBB` to `rgba(r,g,b,a)` for gradients / chart fills. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
