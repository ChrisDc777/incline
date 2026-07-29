import { Pressable, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
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
        'flex-row items-center gap-2 rounded-2xl px-3 py-2.5',
        completed ? 'bg-success/10' : 'bg-muted/40',
      )}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
        <Text className="text-xs font-bold text-muted-foreground">{index + 1}</Text>
      </View>

      <NumberStepper value={weight} onChange={onChangeWeight} step={2.5} suffix={unit === 'metric' ? 'kg' : 'lb'} decimals={1} />
      <Text className="text-muted-foreground">×</Text>
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
        {completed ? <Check size={18} className="text-success-foreground" /> : null}
      </Pressable>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove set"
          onPress={onRemove}
          className="h-8 w-8 items-center justify-center">
          <X size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
