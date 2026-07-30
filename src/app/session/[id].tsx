import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Plus, X } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ExerciseBlock } from '@/components/workout/exercise-block';
import { ExercisePickerSheet } from '@/components/workout/exercise-picker-sheet';
import { RestTimer } from '@/components/workout/rest-timer';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { useHaptics } from '@/hooks/use-haptics';
import { useActiveWorkout } from '@/store/active-workout-store';
import { useSettings } from '@/store/settings-store';
import { useToast } from '@/components/ui/toast';
import {
  addExerciseToWorkout,
  addSet,
  discardWorkout,
  finishWorkout,
  getLastSetsForExercise,
  getWorkoutLog,
  removeSet,
  updateSet,
  type SessionWorkout,
} from '@/db/queries';
import { formatClock, formatVolume } from '@/db/calc';
import type { Exercise, SetEntry } from '@/db/types';

interface Group {
  exerciseId: number;
  exerciseName: string;
  sets: SetEntry[];
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const router = useRouter();
  const { toast } = useToast();
  const { notify, impact } = useHaptics();
  const clear = useActiveWorkout((s) => s.clear);
  const { unit } = useSettings();
  const rest = useRestTimer();

  const [session, setSession] = useState<SessionWorkout | null>(null);
  const [lastSetsMap, setLastSetsMap] = useState<Record<number, SetEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [restSecondsMap, setRestSecondsMap] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    const s = await getWorkoutLog(logId);
    if (s) {
      const exIds = [...new Set(s.sets.map((x) => x.exerciseId))];
      const map: Record<number, SetEntry[]> = {};
      await Promise.all(exIds.map(async (eid) => { map[eid] = await getLastSetsForExercise(eid); }));
      setLastSetsMap(map);
    }
    setSession(s);
    setLoading(false);
  }, [logId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    if (session?.isComplete) router.replace(`/summary/${session.id}`);
  }, [session?.isComplete, router]);

  const groups: Group[] = [];
  for (const s of session?.sets ?? []) {
    let g = groups.find((x) => x.exerciseId === s.exerciseId);
    if (!g) {
      g = { exerciseId: s.exerciseId, exerciseName: s.exerciseName, sets: [] };
      groups.push(g);
    }
    g.sets.push(s);
  }

  const reload = () => load();
  const onChangeWeight = async (setId: number, v: number) => { await updateSet(setId, { weight: v }); reload(); };
  const onChangeReps = async (setId: number, v: number) => { await updateSet(setId, { reps: v }); reload(); };
  const onChangeRestSeconds = (exerciseId: number, seconds: number) => {
    setRestSecondsMap((prev) => ({ ...prev, [exerciseId]: seconds }));
  };
  const onToggleComplete = async (setId: number) => {
    const target = session?.sets.find((x) => x.id === setId);
    const next = !target?.completed;
    await updateSet(setId, { completed: next, restSeconds: next ? (restSecondsMap[target?.exerciseId ?? 0] ?? 0) : null });
    reload();
    impact();
    if (next) {
      const exRest = restSecondsMap[target?.exerciseId ?? 0] ?? 0;
      if (exRest > 0) rest.start(exRest);
    }
  };
  const onRemoveSet = async (setId: number) => { await removeSet(setId); reload(); };
  const onAddSet = async (exerciseId: number) => { impact(); await addSet(logId, exerciseId); reload(); };
  const onPickExercise = async (ex: Exercise) => {
    impact();
    await addExerciseToWorkout(logId, ex.id);
    setPickerOpen(false);
    reload();
  };

  const finish = async () => {
    setFinishOpen(false);
    await finishWorkout(logId);
    clear();
    toast({ title: 'Workout saved', description: 'Great session — check your progress.', variant: 'success' });
    router.replace(`/summary/${logId}`);
  };
  const discard = async () => {
    setDiscardOpen(false);
    await discardWorkout(logId);
    clear();
    router.replace('/(app)/(tabs)');
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#25ca62" />
      </SafeAreaView>
    );
  if (!session) return null;

  const completedSets = session.sets.filter((s) => s.completed).length;
  const totalSets = session.sets.length;
  const totalVolume = session.sets.reduce((acc, s) => acc + (s.completed ? s.weight * s.reps : 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Discard workout" onPress={() => setDiscardOpen(true)} className="p-1">
          <Icon icon={X} size={24} color="muted-foreground" />
        </Pressable>
        <View className="items-center">
          <Body className="font-semibold text-foreground">{session.name}</Body>
          <Caption>{formatClock(elapsed)}</Caption>
        </View>
        <Button size="sm" variant="success" leftIcon={<Icon icon={Check} size={16} color="success-foreground" />} onPress={() => setFinishOpen(true)}>
          Finish
        </Button>
      </View>

      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-1 items-center">
          <Caption>Duration</Caption>
          <Body className="mt-0.5 font-semibold text-primary">{formatClock(elapsed)}</Body>
        </View>
        <View className="flex-1 items-center">
          <Caption>Volume</Caption>
          <Body className="mt-0.5 font-semibold text-foreground">{formatVolume(totalVolume, unit)}</Body>
        </View>
        <View className="flex-1 items-center">
          <Caption>Sets</Caption>
          <Body className="mt-0.5 font-semibold text-foreground">{completedSets}/{totalSets}</Body>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Button variant="outline" className="mb-4" leftIcon={<Icon icon={Plus} size={16} color="primary" />} onPress={() => setPickerOpen(true)}>
          Add exercise
        </Button>

        {groups.length === 0 ? (
          <View className="items-center py-16">
            <Body className="font-semibold text-foreground">No exercises yet</Body>
            <Caption className="mt-1 text-center">Add an exercise to start logging sets.</Caption>
          </View>
        ) : (
          <View className="gap-5">
            {groups.map((g, i) => (
              <View key={g.exerciseId}>
                {i > 0 && <View className="mb-5 h-px bg-border/40" />}
                <ExerciseBlock
                  name={g.exerciseName}
                  sets={g.sets}
                  unit={session.unit}
                  lastSets={lastSetsMap[g.exerciseId] ?? []}
                  restSeconds={restSecondsMap[g.exerciseId] ?? 0}
                  onChangeRestSeconds={(s) => onChangeRestSeconds(g.exerciseId, s)}
                  onChangeWeight={onChangeWeight}
                  onChangeReps={onChangeReps}
                  onToggleComplete={onToggleComplete}
                  onRemoveSet={onRemoveSet}
                  onAddSet={() => onAddSet(g.exerciseId)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {rest.running || rest.remaining > 0 ? (
        <RestTimer
          remaining={rest.remaining}
          total={rest.total}
          onAdd={rest.add}
          onSkip={rest.stop}
        />
      ) : null}

      <ExercisePickerSheet open={pickerOpen} onOpenChange={setPickerOpen} onPick={onPickExercise} />

      <Dialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title="Finish workout?"
        description={`You completed ${completedSets} of ${totalSets} sets. Save this session to your history.`}
        footer={
          <>
            <Button variant="outline" onPress={() => setFinishOpen(false)}>Keep logging</Button>
            <Button variant="success" onPress={finish}>Finish &amp; save</Button>
          </>
        }
      />
      <Dialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard workout?"
        description="This session and all logged sets will be permanently deleted."
        footer={
          <>
            <Button variant="outline" onPress={() => setDiscardOpen(false)}>Cancel</Button>
            <Button variant="destructive" onPress={discard}>Discard</Button>
          </>
        }
      />
    </SafeAreaView>
  );
}
