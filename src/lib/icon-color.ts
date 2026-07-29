import { useAppColorScheme } from '@/lib/use-color-scheme';

export type IconColor = 'primary' | 'primary-foreground' | 'secondary-foreground' | 'muted-foreground' | 'destructive' | 'destructive-foreground' | 'success' | 'success-foreground' | 'warning' | 'warning-foreground' | 'info' | 'info-foreground' | 'foreground' | 'card-foreground' | 'accent-foreground' | 'border';

const LIGHT: Record<IconColor, string> = {
  primary: 'hsl(142 69% 45%)',
  'primary-foreground': 'hsl(240 10% 4%)',
  'secondary-foreground': 'hsl(240 5.9% 10%)',
  'muted-foreground': 'hsl(240 3.8% 46.1%)',
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

const DARK: Record<IconColor, string> = {
  primary: 'hsl(142 69% 47%)',
  'primary-foreground': 'hsl(240 10% 4%)',
  'secondary-foreground': 'hsl(0 0% 98%)',
  'muted-foreground': 'hsl(240 5% 64.9%)',
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
  border: 'hsl(240 3.7% 16%)',
};

export function resolveIconColor(color: IconColor | string, isDark: boolean): string {
  const map = isDark ? DARK : LIGHT;
  return map[color as IconColor] ?? color;
}

export function useIconColor(color: IconColor | string): string {
  const isDark = useAppColorScheme() === 'dark';
  return resolveIconColor(color, isDark);
}
