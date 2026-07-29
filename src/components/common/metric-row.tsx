import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';

/** A label + value row used in detail screens and summaries. */
export function MetricRow({
  label,
  value,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-center justify-between py-2.5', className)}>
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </View>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}
