import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/common/icon';
import { Check, X } from 'lucide-react-native';
import { NumberStepper } from './number-stepper';
import type { Unit } from '@/db/types';

/** A single set row: index, weight, reps, and a complete toggle. */
export function SetRow({
  index,
  weight,
  reps,
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
  completed: boolean;
  unit: Unit;
  onChangeWeight: (v: number) => void;
  onChangeReps: (v: number) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
}) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-2xl px-3 py-2',
        completed ? 'bg-success/10' : 'bg-muted/40',
      )}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
        <Text className="text-xs font-bold text-muted-foreground">{index + 1}</Text>
      </View>

      <NumberStepper value={weight} onChange={onChangeWeight} step={2.5} suffix={unit === 'metric' ? 'kg' : 'lb'} decimals={1} />
      <Text className="text-sm text-muted-foreground">×</Text>
      <NumberStepper value={reps} onChange={onChangeReps} step={1} suffix="reps" />

      <View className="flex-1" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={completed ? 'Mark incomplete' : 'Complete set'}
        accessibilityState={{ checked: completed }}
        onPress={onToggleComplete}
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full',
          completed ? 'bg-success' : 'border-2 border-border',
        )}>
        {completed ? <Icon icon={Check} size={18} color="success-foreground" /> : null}
      </Pressable>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove set"
          onPress={onRemove}
          className="h-8 w-8 items-center justify-center">
          <Icon icon={X} size={16} color="muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
