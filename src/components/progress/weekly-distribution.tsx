import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { MUSCLE_LABELS, muscleColor } from '@/lib/labels';
import { formatVolume } from '@/db/calc';
import type { MuscleDistribution, Unit } from '@/db/types';

/** Horizontal bar list showing training volume per muscle group. */
export function WeeklyDistribution({ data, unit, className }: { data: MuscleDistribution[]; unit: Unit; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.sets));
  const top = data.slice(0, 6);
  if (top.length === 0) {
    return <Text className="text-sm text-muted-foreground">No training data yet.</Text>;
  }
  return (
    <View className={cn('gap-3', className)}>
      {top.map((d) => (
        <View key={d.muscle}>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">{MUSCLE_LABELS[d.muscle]}</Text>
            <Text className="text-xs text-muted-foreground">
              {d.sets} sets · {formatVolume(d.volume, unit)}
            </Text>
          </View>
          <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full"
              style={{ width: `${(d.sets / max) * 100}%`, backgroundColor: muscleColor(d.muscle) }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
