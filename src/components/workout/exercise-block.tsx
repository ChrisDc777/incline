import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { SetRow } from './set-row';
import { RestTimerPickerSheet } from './rest-timer-picker-sheet';
import type { SetEntry, Unit } from '@/db/types';
import { Plus, Clock } from 'lucide-react-native';

/**
 * One exercise within an active session: header (name + rest timer config) and
 * its set rows, plus an "Add set" action.
 */
export function ExerciseBlock({
  name,
  exerciseId,
  sets,
  unit,
  lastSets,
  restSeconds,
  onChangeRestSeconds,
  onChangeWeight,
  onChangeReps,
  onToggleComplete,
  onRemoveSet,
  onAddSet,
  className,
}: {
  name: string;
  exerciseId: number;
  sets: SetEntry[];
  unit: Unit;
  lastSets: SetEntry[];
  restSeconds: number;
  onChangeRestSeconds: (seconds: number) => void;
  onChangeWeight: (setId: number, v: number) => void;
  onChangeReps: (setId: number, v: number) => void;
  onToggleComplete: (setId: number) => void;
  onRemoveSet: (setId: number) => void;
  onAddSet: () => void;
  className?: string;
}) {
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const completedCount = sets.filter((s) => s.completed).length;

  return (
    <View className={cn('gap-2', className)}>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-base font-semibold text-foreground">{name}</Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-xs text-muted-foreground">
            {completedCount}/{sets.length}
          </Text>
          <Pressable
            onPress={() => setRestPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Rest timer: ${restSeconds > 0 ? restSeconds + 's' : 'off'}`}
            className="flex-row items-center gap-1">
            <Icon icon={Clock} size={13} color={restSeconds > 0 ? 'primary' : 'muted-foreground'} />
            <Text className={cn('text-xs', restSeconds > 0 ? 'font-medium text-primary' : 'text-muted-foreground')}>
              {restSeconds > 0 ? `${restSeconds}s` : 'Off'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-1">
        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            index={i}
            weight={s.weight}
            reps={s.reps}
            previousWeight={lastSets[i]?.weight}
            previousReps={lastSets[i]?.reps}
            completed={s.completed}
            unit={unit}
            onChangeWeight={(v) => onChangeWeight(s.id, v)}
            onChangeReps={(v) => onChangeReps(s.id, v)}
            onToggleComplete={() => onToggleComplete(s.id)}
            onRemove={sets.length > 1 ? () => onRemoveSet(s.id) : undefined}
          />
        ))}
      </View>

      <Pressable
        onPress={onAddSet}
        className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2"
        accessibilityRole="button"
        accessibilityLabel="Add set">
        <Icon icon={Plus} size={15} color="primary" />
        <Text className="text-sm font-medium text-primary">Add set</Text>
      </Pressable>

      <RestTimerPickerSheet
        open={restPickerOpen}
        onOpenChange={setRestPickerOpen}
        currentValue={restSeconds}
        exerciseId={exerciseId}
        onSelect={onChangeRestSeconds}
      />
    </View>
  );
}
