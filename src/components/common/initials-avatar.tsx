import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';

/** Avatar derived from initials (no image assets needed for the MVP). */
export function InitialsAvatar({
  name,
  size = 44,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return (
    <View
      className={cn('items-center justify-center rounded-full bg-primary', className)}
      style={{ width: size, height: size }}>
      <Text className="font-semibold text-primary-foreground" style={{ fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );
}
