import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/common/icon';
import { Check, X } from 'lucide-react-native';
import { NumberStepper } from './number-stepper';
import { formatWeight } from '@/db/calc';
import type { Unit } from '@/db/types';

/** A single set row: index, previous, weight, reps, and a complete toggle. */
export function SetRow({
  index,
  weight,
  reps,
  previousWeight,
  previousReps,
  completed,
  unit,
  onChangeWeight,
  onChangeReps,
  onToggleComplete,
  onRemove,
}: {
  index: number;
  weight: number;
  reps: number;
  previousWeight?: number;
  previousReps?: number;
  completed: boolean;
  unit: Unit;
  onChangeWeight: (v: number) => void;
  onChangeReps: (v: number) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
}) {
  const hasPrevious = previousWeight !== undefined && previousWeight > 0;
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-xl px-1 py-1.5',
        completed && 'bg-success/8',
      )}>
      <View className="w-6 items-center">
        <Text className="text-sm font-bold text-muted-foreground">{index + 1}</Text>
      </View>

      <View className="w-[72px] items-center">
        {hasPrevious ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {formatWeight(previousWeight!, unit)} × {previousReps}
          </Text>
        ) : (
          <Text className="text-xs text-muted-foreground">—</Text>
        )}
      </View>

      <NumberStepper value={weight} onChange={onChangeWeight} step={2.5} suffix={unit === 'metric' ? 'kg' : 'lb'} decimals={1} />
      <NumberStepper value={reps} onChange={onChangeReps} step={1} suffix="reps" />

      <View className="flex-1" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={completed ? 'Mark incomplete' : 'Complete set'}
        accessibilityState={{ checked: completed }}
        onPress={onToggleComplete}
        hitSlop={8}
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full',
          completed ? 'bg-success' : 'border-2 border-border',
        )}>
        <Icon icon={Check} size={20} color="success-foreground" />
      </Pressable>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove set"
          onPress={onRemove}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center">
          <Icon icon={X} size={16} color="muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
