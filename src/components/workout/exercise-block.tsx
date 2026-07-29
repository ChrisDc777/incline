import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { SetRow } from './set-row';
import { PreviousBestBadge } from './previous-best-badge';
import type { SetEntry, Unit } from '@/db/types';
import { Plus } from 'lucide-react-native';

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
    <View className={cn('gap-2', className)}>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-base font-semibold text-foreground">{name}</Text>
        <Text className="text-xs text-muted-foreground">
          {completedCount}/{sets.length}
        </Text>
      </View>
      <PreviousBestBadge lastSets={lastSets} unit={unit} className="px-1" />

      <View className="gap-1.5">
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
        className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2"
        accessibilityRole="button"
        accessibilityLabel="Add set">
        <Icon icon={Plus} size={15} color="primary" />
        <Text className="text-sm font-medium text-primary">Add set</Text>
      </Pressable>
    </View>
  );
}
