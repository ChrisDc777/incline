import { ACCENT_THEMES, DEFAULT_ACCENT_THEME, type AccentTheme } from '@/lib/accent-themes';
import { useSettings } from '@/store/settings-store';
import { useAppColorScheme } from '@/lib/use-color-scheme';

export type IconColor =
  | 'primary'
  | 'primary-foreground'
  | 'secondary-foreground'
  | 'muted-foreground'
  | 'destructive'
  | 'destructive-foreground'
  | 'success'
  | 'success-foreground'
  | 'warning'
  | 'warning-foreground'
  | 'info'
  | 'info-foreground'
  | 'foreground'
  | 'card-foreground'
  | 'accent-foreground'
  | 'border';

const LIGHT_BASE: Record<Exclude<IconColor, 'primary' | 'primary-foreground'>, string> = {
  'secondary-foreground': 'hsl(240 5.9% 10%)',
  'muted-foreground': 'hsl(240 4% 40%)',
  destructive: 'hsl(0 72% 51%)',
  'destructive-foreground': 'hsl(0 0% 98%)',
  success: 'hsl(142 64% 38%)',
  'success-foreground': 'hsl(0 0% 100%)',
  warning: 'hsl(38 92% 50%)',
  'warning-foreground': 'hsl(0 0% 100%)',
  info: 'hsl(217 91% 60%)',
  'info-foreground': 'hsl(0 0% 100%)',
  foreground: 'hsl(240 10% 3.9%)',
  'card-foreground': 'hsl(240 10% 3.9%)',
  'accent-foreground': 'hsl(240 5.9% 10%)',
  border: 'hsl(240 5.9% 90%)',
};

const DARK_BASE: Record<Exclude<IconColor, 'primary' | 'primary-foreground'>, string> = {
  'secondary-foreground': 'hsl(0 0% 98%)',
  'muted-foreground': 'hsl(240 5% 70%)',
  destructive: 'hsl(0 62.8% 50%)',
  'destructive-foreground': 'hsl(0 0% 98%)',
  success: 'hsl(142 60% 45%)',
  'success-foreground': 'hsl(0 0% 100%)',
  warning: 'hsl(38 90% 54%)',
  'warning-foreground': 'hsl(0 0% 100%)',
  info: 'hsl(217 88% 64%)',
  'info-foreground': 'hsl(240 10% 4%)',
  foreground: 'hsl(0 0% 98%)',
  'card-foreground': 'hsl(0 0% 98%)',
  'accent-foreground': 'hsl(0 0% 98%)',
  border: 'hsl(240 5% 15%)',
};

export function resolveIconColor(
  color: IconColor | string,
  isDark: boolean,
  accent: AccentTheme = DEFAULT_ACCENT_THEME,
): string {
  if (color === 'primary') {
    const channels = isDark
      ? (ACCENT_THEMES[accent] ?? ACCENT_THEMES.indigo).dark.primary
      : (ACCENT_THEMES[accent] ?? ACCENT_THEMES.indigo).light.primary;
    return `hsl(${channels})`;
  }
  if (color === 'primary-foreground') {
    // Match CSS per accent: dark ink on copper/emerald (light) and most dark primaries;
    // white on indigo/teal/coral in light mode.
    if (isDark) return 'hsl(240 10% 4%)';
    if (accent === 'copper' || accent === 'emerald') return 'hsl(240 10% 4%)';
    return 'hsl(0 0% 100%)';
  }
  const map = isDark ? DARK_BASE : LIGHT_BASE;
  return map[color as keyof typeof map] ?? color;
}

export function useIconColor(color: IconColor | string): string {
  const isDark = useAppColorScheme() === 'dark';
  const accent = useSettings((s) => s.accentTheme);
  return resolveIconColor(color, isDark, accent);
}
