import { useSettings } from '@/store/settings-store';
import { chartPaletteFor } from '@/lib/accent-themes';
import { useAppColorScheme } from '@/lib/use-color-scheme';

/** Chart palette for the active accent + color scheme. */
export function useChartPalette(): string[] {
  const accent = useSettings((s) => s.accentTheme);
  const scheme = useAppColorScheme() === 'dark' ? 'dark' : 'light';
  return chartPaletteFor(accent, scheme);
}
