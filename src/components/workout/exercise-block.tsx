import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { SetRow } from './set-row';
import { PreviousBestBadge } from './previous-best-badge';
import type { SetEntry, Unit } from '@/db/types';

export interface BlockSet {
  set: SetEntry;
  lastWeight: number;
  lastReps: number;
}

/**
 * One exercise within an active session: header (name + carry-over hint) and
 * its set rows, plus an "Add set" action that copies the last set's values.
 */
export function ExerciseBlock({
  name,
  sets,
  unit,
  lastSets,
  onChangeWeight,
  onChangeReps,
  onToggleComplete,
  onRemoveSet,
  onAddSet,
  className,
}: {
  name: string;
  sets: SetEntry[];
  unit: Unit;
  lastSets: SetEntry[];
  onChangeWeight: (setId: number, v: number) => void;
  onChangeReps: (setId: number, v: number) => void;
  onToggleComplete: (setId: number) => void;
  onRemoveSet: (setId: number) => void;
  onAddSet: () => void;
  className?: string;
}) {
  const completedCount = sets.filter((s) => s.completed).length;
  return (
    <View className={cn('rounded-3xl border border-border/60 bg-card p-4', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">{name}</Text>
        <Text className="text-xs text-muted-foreground">
          {completedCount}/{sets.length}
        </Text>
      </View>
      <PreviousBestBadge lastSets={lastSets} unit={unit} className="mt-1" />

      <View className="mt-3 gap-2">
        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            index={i}
            weight={s.weight}
            reps={s.reps}
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
        className="mt-3 flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-2.5"
        accessibilityRole="button"
        accessibilityLabel="Add set">
        <Plus size={16} className="text-primary" />
        <Text className="text-sm font-medium text-primary">Add set</Text>
      </Pressable>
    </View>
  );
}
