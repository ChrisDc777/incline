import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, MessageSquarePlus, Pause, Play, Plus, Undo2, X, Dumbbell } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import { ExerciseBlock } from '@/components/workout/exercise-block';
import { ExercisePickerSheet } from '@/components/workout/exercise-picker-sheet';
import { RestTimer } from '@/components/workout/rest-timer';
import { PlateCalculator } from '@/components/workout/plate-calculator';
import { RestPresetBar } from '@/components/workout/rest-preset-bar';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { useRestTimerSound } from '@/hooks/use-rest-timer-sound';
import { useHaptics } from '@/hooks/use-haptics';
import { useActiveWorkout } from '@/store/active-workout-store';
import { useSettings } from '@/store/settings-store';
import { useToast } from '@/components/ui/toast';
import {
  addExerciseToWorkout,
  addSet,
  addWarmUpSet,
  discardWorkout,
  finishWorkout,
  getLastSetsForExercise,
  getWorkoutLog,
  removeSet,
  updateSet,
  updateWorkoutNotes,
  type SessionWorkout,
} from '@/db/queries';
import { openDatabase } from '@/db/client';
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
  const { impact } = useHaptics();
  const clear = useActiveWorkout((s) => s.clear);
  const { unit } = useSettings();
  const rest = useRestTimer();
  const restSound = useRestTimerSound();

  // Play sound when rest timer finishes
  useEffect(() => {
    if (rest.justFinished) restSound.play();
  }, [rest.justFinished, restSound]);

  const [session, setSession] = useState<SessionWorkout | null>(null);
  const [lastSetsMap, setLastSetsMap] = useState<Record<number, SetEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [restSecondsMap, setRestSecondsMap] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const notesRef = useRef<TextInput>(null);
  const [removedSet, setRemovedSet] = useState<{ setEntry: SetEntry; exerciseId: number; logId: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const [timerSheetOpen, setTimerSheetOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const pausedAtRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const s = await getWorkoutLog(logId);
    if (s) {
      const exIds = [...new Set(s.sets.map((x) => x.exerciseId))];
      const map: Record<number, SetEntry[]> = {};
      await Promise.all(exIds.map(async (eid) => { map[eid] = await getLastSetsForExercise(eid); }));
      setLastSetsMap(map);
    }
    setSession(s);
    if (s) setNotes(s.notes ?? '');
    setLoading(false);
  }, [logId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      if (pausedAtRef.current) return;
      const now = Date.now();
      setElapsed(Math.floor((now - session.startedAt - totalPausedMsRef.current) / 1000));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    if (session?.isComplete) router.replace(`/summary/${session.id}`);
  }, [session?.isComplete, session?.id, router]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const onPause = () => {
    const now = Date.now();
    setPausedAt(now);
    pausedAtRef.current = now;
    impact();
  };

  const onResume = () => {
    if (pausedAt) {
      totalPausedMsRef.current += Date.now() - pausedAt;
      setPausedAt(null);
      pausedAtRef.current = null;
      impact();
    }
  };

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
  const applyRestToAll = (seconds: number) => {
    const map: Record<number, number> = {};
    for (const s of session?.sets ?? []) {
      map[s.exerciseId] = seconds;
    }
    setRestSecondsMap(map);
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
  const onRemoveSet = async (setId: number) => {
    const target = session?.sets.find((s) => s.id === setId);
    if (!target) return;
    // Save the removed set for undo
    setRemovedSet({ setEntry: target, exerciseId: target.exerciseId, logId });
    // Clear any existing undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Auto-dismiss after 5 seconds
    undoTimerRef.current = setTimeout(() => setRemovedSet(null), 5000);
    await removeSet(setId);
    reload();
  };
  const onUndoRemove = async () => {
    if (!removedSet) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const { setEntry, logId: lid } = removedSet;
    const db = await openDatabase();
    // Re-insert the set with its original values
    await db.runAsync(
      `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      lid, setEntry.exerciseId, setEntry.setIndex, setEntry.weight, setEntry.reps, setEntry.completed ? 1 : 0, setEntry.restSeconds, setEntry.createdAt,
    );
    setRemovedSet(null);
    reload();
  };
  const onAddSet = async (exerciseId: number) => { impact(); await addSet(logId, exerciseId); reload(); };
  const onAddWarmUp = async (exerciseId: number) => { impact(); await addWarmUpSet(logId, exerciseId); reload(); };
  const onPickExercise = async (ex: Exercise) => {
    impact();
    await addExerciseToWorkout(logId, ex.id);
    setPickerOpen(false);
    reload();
  };

  const finish = async () => {
    setFinishOpen(false);
    if (notes.trim()) await updateWorkoutNotes(logId, notes.trim());
    // If paused, account for the paused time in duration
    const pauseBonus = pausedAt ? Date.now() - pausedAt : 0;
    if (totalPausedMsRef.current > 0 || pauseBonus > 0) {
      const db = await openDatabase();
      const log = await db.getFirstAsync<{ started_at: number }>('SELECT started_at FROM workout_logs WHERE id = ?', logId);
      if (log) {
        const realDuration = Math.max(0, Date.now() - log.started_at - totalPausedMsRef.current - pauseBonus);
        await db.runAsync('UPDATE workout_logs SET duration_seconds = ? WHERE id = ?', Math.floor(realDuration / 1000), logId);
      }
    }
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
        <ActivityIndicator color="#16a34a" />
      </SafeAreaView>
    );
  if (!session) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Body className="text-center font-semibold text-foreground">Workout not found</Body>
        <Caption className="mt-2 text-center">This session may have been discarded.</Caption>
        <Button className="mt-4" onPress={() => router.replace('/(app)/(tabs)')}>Go home</Button>
      </SafeAreaView>
    );
  }

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
        <Pressable
          onPress={() => setTimerSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Workout timer"
          className="flex-1 items-center">
          <Caption>Duration</Caption>
          <Body className="mt-0.5 font-semibold text-primary">{formatClock(elapsed)}</Body>
          {pausedAt ? (
            <Caption className="mt-0.5 text-amber-500">Paused</Caption>
          ) : null}
        </Pressable>
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
        <Button variant="outline" className="mb-3" leftIcon={<Icon icon={Plus} size={16} color="primary" />} onPress={() => setPickerOpen(true)}>
          Add exercise
        </Button>

        {session.sets.length > 0 && (
          <View className="mb-4 rounded-2xl bg-card p-3">
            <Caption className="mb-2 text-muted-foreground">Set rest for all exercises</Caption>
            <RestPresetBar onSelect={applyRestToAll} />
          </View>
        )}

        <Pressable
          onPress={() => setNotesOpen(!notesOpen)}
          className="mb-3 flex-row items-center gap-2 rounded-xl bg-card px-4 py-3">
          <Icon icon={MessageSquarePlus} size={16} color="primary" />
          <Body className="text-sm text-foreground">{notesOpen ? 'Hide notes' : notes ? 'Show notes' : 'Add notes'}</Body>
        </Pressable>

        {notesOpen && (
          <View className="mb-4 rounded-xl bg-card p-4">
            <Caption className="mb-2">Workout notes</Caption>
            <TextInput
              ref={notesRef}
              value={notes}
              onChangeText={setNotes}
              onBlur={() => { if (session) updateWorkoutNotes(logId, notes); }}
              placeholder="How did this session feel?"
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80, fontSize: 14, lineHeight: 20 }}
            />
          </View>
        )}

        {!plateCalcOpen ? (
          <Pressable
            onPress={() => setPlateCalcOpen(true)}
            className="mb-3 flex-row items-center gap-2 rounded-xl bg-card px-4 py-3">
            <Icon icon={Dumbbell} size={16} color="primary" />
            <Body className="text-sm text-foreground">Plate calculator</Body>
          </Pressable>
        ) : (
          <View className="mb-3">
            <Pressable
              onPress={() => setPlateCalcOpen(false)}
              className="mb-2 flex-row items-center gap-2">
              <Icon icon={Dumbbell} size={16} color="primary" />
              <Body className="text-sm font-semibold text-foreground">Plate calculator</Body>
            </Pressable>
            <PlateCalculator />
          </View>
        )}

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
                  exerciseId={g.exerciseId}
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
                  onAddWarmUp={() => onAddWarmUp(g.exerciseId)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {removedSet ? (
        <View className="absolute inset-x-0 bottom-20 z-30 px-4">
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3 border border-border shadow-lg">
            <Body className="text-sm text-foreground">Set removed</Body>
            <Pressable
              onPress={onUndoRemove}
              accessibilityRole="button"
              accessibilityLabel="Undo remove set"
              className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-2">
              <Icon icon={Undo2} size={14} color="primary-foreground" />
              <Text className="text-sm font-semibold text-primary-foreground">Undo</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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

      <Sheet open={timerSheetOpen} onOpenChange={setTimerSheetOpen} title="Workout Timer" snapPoints={['25%']} dynamicSizing={false}>
        <View className="items-center gap-3 py-2">
          <Body className="text-sm text-muted-foreground">Elapsed time</Body>
          <Body className="text-5xl font-bold tracking-tight text-foreground">{formatClock(elapsed)}</Body>
          {pausedAt ? (
            <Caption className="text-amber-500">Paused</Caption>
          ) : null}
          <View className="mt-1 flex-row gap-3">
            {pausedAt ? (
              <Button
                size="lg"
                leftIcon={<Icon icon={Play} size={18} color="success-foreground" />}
                variant="success"
                onPress={onResume}>
                Resume
              </Button>
            ) : (
              <Button
                size="lg"
                leftIcon={<Icon icon={Pause} size={18} color="primary-foreground" />}
                onPress={onPause}>
                Pause
              </Button>
            )}
          </View>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
