import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

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
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    if (completed) {
      // Bounce the row
      scale.value = withSpring(1.03, { damping: 8, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
      // Pop the checkmark
      checkScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    } else {
      checkScale.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  }, [completed]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const hasPrevious = previousWeight !== undefined && previousWeight > 0;
  return (
    <Animated.View
      style={rowStyle}
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
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          completed ? 'bg-success' : 'border-2 border-border',
        )}>
        <Animated.View style={checkStyle}>
          <Icon icon={Check} size={16} color="success-foreground" />
        </Animated.View>
      </Pressable>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove set"
          onPress={onRemove}
          className="h-7 w-7 items-center justify-center">
          <Icon icon={X} size={14} color="muted-foreground" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
