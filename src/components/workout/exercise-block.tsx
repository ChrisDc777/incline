import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { SetRow, type SetRowHandle } from './set-row';
import { PreviousBestBadge } from './previous-best-badge';
import { RestTimerPickerSheet } from './rest-timer-picker-sheet';
import { formatWeight } from '@/db/calc';
import type { SetEntry, Unit } from '@/db/types';
import type { ExercisePRSummary } from '@/db/queries';
import { Plus, Clock, Flame } from 'lucide-react-native';
import { SET_COL } from './set-layout';

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
  prSummary,
  restSeconds,
  onChangeRestSeconds,
  onChangeWeight,
  onChangeReps,
  onToggleComplete,
  onRemoveSet,
  onAddSet,
  onAddWarmUp,
  showWarmUpSets = true,
  className,
}: {
  name: string;
  exerciseId: number;
  sets: SetEntry[];
  unit: Unit;
  lastSets: SetEntry[];
  prSummary?: ExercisePRSummary | null;
  restSeconds: number;
  onChangeRestSeconds: (seconds: number) => void;
  onChangeWeight: (setId: number, v: number) => void;
  onChangeReps: (setId: number, v: number) => void;
  onToggleComplete: (setId: number) => void;
  onRemoveSet: (setId: number) => void;
  onAddSet: () => void;
  onAddWarmUp: () => void;
  showWarmUpSets?: boolean;
  className?: string;
}) {
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const rowRefs = useRef<(SetRowHandle | null)[]>([]);
  const completedCount = sets.filter((s) => s.completed).length;
  const weightLabel = unit === 'metric' ? 'KG' : 'LB';

  const workingWeight = sets.find((s) => !s.completed && s.weight > 0)?.weight
    ?? sets.filter((s) => s.completed).at(-1)?.weight
    ?? lastSets[0]?.weight
    ?? 0;
  const prGap =
    prSummary && prSummary.heaviestWeight > 0
      ? prSummary.heaviestWeight - workingWeight
      : null;

  return (
    <View className={cn('gap-2 rounded-2xl px-1 py-1', className)}>
      <View className="flex-row items-center justify-between px-1">
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{name}</Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <PreviousBestBadge lastSets={lastSets} unit={unit} />
            {prGap !== null && workingWeight > 0 ? (
              <Text className="text-xs text-muted-foreground">
                {prGap > 0
                  ? `${formatWeight(prGap, unit)} to PR`
                  : prGap === 0
                    ? 'At PR weight'
                    : `${formatWeight(Math.abs(prGap), unit)} over PR`}
              </Text>
            ) : null}
          </View>
        </View>
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

      <View className="flex-row items-center gap-2 px-1 pb-0.5">
        <View style={{ width: SET_COL.index }} className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Set</Text>
        </View>
        <View style={{ width: SET_COL.prev }} className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prev</Text>
        </View>
        <View style={{ width: SET_COL.weight }} className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{weightLabel}</Text>
        </View>
        <View style={{ width: SET_COL.reps }} className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reps</Text>
        </View>
        <View className="flex-1" />
        <View style={{ width: SET_COL.done }} className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Done</Text>
        </View>
      </View>

      <View className="gap-1">
        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            ref={(el) => { rowRefs.current[i] = el; }}
            index={i}
            weight={s.weight}
            reps={s.reps}
            previousWeight={lastSets[i]?.weight}
            previousReps={lastSets[i]?.reps}
            completed={s.completed}
            unit={unit}
            onChangeWeight={(v) => onChangeWeight(s.id, v)}
            onChangeReps={(v) => onChangeReps(s.id, v)}
            onApplyPrevious={
              lastSets[i] && lastSets[i].weight > 0
                ? () => {
                    onChangeWeight(s.id, lastSets[i].weight);
                    onChangeReps(s.id, lastSets[i].reps);
                  }
                : undefined
            }
            onToggleComplete={() => onToggleComplete(s.id)}
            onRemove={sets.length > 1 ? () => onRemoveSet(s.id) : undefined}
            onSubmitReps={i + 1 < sets.length ? () => rowRefs.current[i + 1]?.focusWeight() : undefined}
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

      {showWarmUpSets ? (
        <Pressable
          onPress={onAddWarmUp}
          className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2"
          accessibilityRole="button"
          accessibilityLabel="Add warm-up set">
          <Icon icon={Flame} size={15} color="warning" />
          <Text className="text-sm font-medium text-warning">Warm-up (~50%)</Text>
        </Pressable>
      ) : null}

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
