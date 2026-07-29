import { type ComponentProps } from 'react';
import { type LucideIcon } from 'lucide-react-native';
import { resolveIconColor, type IconColor } from '@/lib/icon-color';
import { useAppColorScheme } from '@/lib/use-color-scheme';

type IconProps = Omit<ComponentProps<LucideIcon>, 'color'> & {
  icon: LucideIcon;
  color?: IconColor | string;
};

export function Icon({ icon: LucideIcon, color = 'primary', size = 20, ...rest }: IconProps) {
  const isDark = useAppColorScheme() === 'dark';
  return <LucideIcon size={size} color={resolveIconColor(color, isDark)} {...rest} />;
}
