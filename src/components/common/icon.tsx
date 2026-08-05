import { type ComponentProps } from 'react';
import { type LucideIcon } from 'lucide-react-native';
import { useIconColor, type IconColor } from '@/lib/icon-color';

type IconProps = Omit<ComponentProps<LucideIcon>, 'color'> & {
  icon: LucideIcon;
  color?: IconColor | string;
};

export function Icon({ icon: LucideIcon, color = 'primary', size = 20, ...rest }: IconProps) {
  // Resolves token names (e.g. "primary") against the Settings accent + scheme.
  // Raw hex/rgb strings pass through unchanged.
  const resolved = useIconColor(color);
  return <LucideIcon size={size} color={resolved} {...rest} />;
}
