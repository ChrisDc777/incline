import { View } from 'react-native';

import { cn } from '@/lib/cn';

export function Progress({
  value,
  className,
  indicatorClass,
}: {
  value: number;
  className?: string;
  indicatorClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View className={cn('h-full rounded-full bg-primary', indicatorClass)} style={{ width: `${pct}%` }} />
    </View>
  );
}
