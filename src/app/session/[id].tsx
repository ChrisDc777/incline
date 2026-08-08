import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, MessageSquarePlus, Pause, Play, Plus, Undo2, X } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import { ExerciseBlock } from '@/components/workout/exercise-block';
import { ExercisePickerSheet } from '@/components/workout/exercise-picker-sheet';
import { DiscardSessionDialog } from '@/components/workout/discard-session-dialog';
import { RestTimer } from '@/components/workout/rest-timer';
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
  getExercisePRSummary,
  getLastSetsForExercise,
  getRestDefaultsForSession,
  getWorkoutLog,
  removeSet,
  restoreSet,
  updateSet,
  updateWorkoutNotes,
  type ExercisePRSummary,
  type SessionWorkout,
} from '@/db/queries';
import { estimated1RM, formatClock, formatVolume, formatWeight } from '@/db/calc';
import { SCREEN_CONTENT_CTA } from '@/lib/layout';
import { METRIC_ICONS } from '@/lib/metric-icons';
import { MuscleBodyMap } from '@/components/progress/muscle-body-map';
import type { Exercise, MuscleGroup, SetEntry } from '@/db/types';

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
  const { impact, notify } = useHaptics();
  const clear = useActiveWorkout((s) => s.clear);
  const { unit, setUnit, restSoundEnabled, autoStartRest, defaultRestSeconds, showWarmUpSets } = useSettings();
  const rest = useRestTimer({ notify: restSoundEnabled });
  const restSound = useRestTimerSound();

  // Play sound when rest timer finishes
  useEffect(() => {
    if (rest.justFinished && restSoundEnabled) restSound.play();
  }, [rest.justFinished, restSound, restSoundEnabled]);

  const [session, setSession] = useState<SessionWorkout | null>(null);
  const [lastSetsMap, setLastSetsMap] = useState<Record<number, SetEntry[]>>({});
  const [prMap, setPrMap] = useState<Record<number, ExercisePRSummary>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const groupRefs = useRef<(View | null)[]>([]);
  const prevActiveGroupRef = useRef<number | null>(null);
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
  const pausedAtRef = useRef<number | null>(null);
  const seededRestRef = useRef(false);

  const load = useCallback(async () => {
    const s = await getWorkoutLog(logId);
    if (s) {
      const exIds = [...new Set(s.sets.map((x) => x.exerciseId))];
      const map: Record<number, SetEntry[]> = {};
      const prs: Record<number, ExercisePRSummary> = {};
      await Promise.all(
        exIds.map(async (eid) => {
          map[eid] = await getLastSetsForExercise(eid);
          prs[eid] = await getExercisePRSummary(eid);
        }),
      );
      setLastSetsMap(map);
      setPrMap(prs);
      // Pre-fill the per-exercise rest timer (template rest, else exercise default)
      // so completing a set auto-starts a countdown. Only on first load — the
      // user's in-session selections must survive reloads.
      if (!seededRestRef.current) {
        seededRestRef.current = true;
        setRestSecondsMap(await getRestDefaultsForSession(logId));
      }
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

  // The exercise the user should be working on: first group that still has an
  // unfinished set, else the last group.
  const activeGroupIndex = (() => {
    if (groups.length === 0) return -1;
    const idx = groups.findIndex((g) => g.sets.some((s) => !s.completed));
    return idx === -1 ? groups.length - 1 : idx;
  })();

  // Auto-scroll to the current exercise when the active group advances.
  useEffect(() => {
    if (loading || !session || activeGroupIndex < 0) return;
    if (prevActiveGroupRef.current === activeGroupIndex) return;
    prevActiveGroupRef.current = activeGroupIndex;
    const t = setTimeout(() => {
      const target = groupRefs.current[activeGroupIndex];
      const scroller = scrollRef.current;
      const node = scroller?.getNativeScrollRef?.();
      if (!target || !scroller || !node) return;
      target.measureLayout(
        node,
        (x, y) => scroller.scrollTo({ y: Math.max(0, y - 140), animated: true }),
        () => {},
      );
    }, 120);
    return () => clearTimeout(t);
  }, [session, activeGroupIndex, loading]);

  const reload = () => load();
  const onChangeWeight = async (setId: number, v: number) => {
    try {
      await updateSet(setId, { weight: v });
      reload();
    } catch {
      toast({ title: 'Could not save weight', variant: 'destructive' });
    }
  };
  const onChangeReps = async (setId: number, v: number) => {
    try {
      await updateSet(setId, { reps: v });
      reload();
    } catch {
      toast({ title: 'Could not save reps', variant: 'destructive' });
    }
  };
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
  const onToggleComplete = (setId: number) => {
    const target = session?.sets.find((x) => x.id === setId);
    if (!target) return;
    const next = !target.completed;
    const restSec = next ? (restSecondsMap[target.exerciseId] ?? 0) : null;
    // Optimistic update: flip the row and start the rest timer immediately,
    // then persist to the DB in the background (no full reload/refetch).
    setSession((prev) =>
      prev
        ? {
            ...prev,
            sets: prev.sets.map((s) =>
              s.id === setId ? { ...s, completed: next, restSeconds: restSec } : s,
            ),
          }
        : prev,
    );
    updateSet(setId, { completed: next, restSeconds: restSec }).catch(() => {
      toast({ title: 'Could not save set', description: 'Please try again.', variant: 'destructive' });
      reload();
    });
    impact();
    if (next) {
      // Celebrate only a genuine record: heavier weight or better estimated
      // 1RM than the best ever logged for this exercise. Requires prior
      // history so first-time lifts don't spam.
      const pr = prMap[target.exerciseId];
      if (pr && (pr.heaviestWeight > 0 || pr.best1RM > 0)) {
        const e1rm = estimated1RM(target.weight, target.reps);
        if (target.weight > pr.heaviestWeight || e1rm > pr.best1RM) {
          // Fold the new lift into the in-memory PR map so later sets this
          // session can build on it without a DB reload.
          setPrMap((prev) => {
            const cur = prev[target.exerciseId];
            if (!cur) return prev;
            return {
              ...prev,
              [target.exerciseId]: {
                ...cur,
                heaviestWeight: Math.max(cur.heaviestWeight, target.weight),
                best1RM: Math.max(cur.best1RM, e1rm),
              },
            };
          });
          notify();
          toast({
            title: 'New PR!',
            description: `${target.exerciseName} · ${formatWeight(target.weight, unit)} × ${target.reps}`,
            variant: 'success',
          });
        }
      }
      if (autoStartRest) {
        // Rest per exercise (seeded from the template or exercise default), else
        // the global default. A value of 0 ("Off") is respected and starts nothing.
        const exRest = restSecondsMap[target.exerciseId] ?? defaultRestSeconds;
        if (exRest > 0) rest.start(exRest);
      }
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
    await restoreSet(removedSet.setEntry.id);
    setRemovedSet(null);
    reload();
  };
  const onAddSet = async (exerciseId: number) => { impact(); await addSet(logId, exerciseId); reload(); };
  const onAddWarmUp = async (exerciseId: number) => { impact(); await addWarmUpSet(logId, exerciseId); reload(); };
  const onPickExercise = async (ex: Exercise) => {
    impact();
    await addExerciseToWorkout(logId, ex.id);
    setRestSecondsMap((prev) => ({ ...prev, [ex.id]: prev[ex.id] ?? ex.defaultRestSeconds ?? defaultRestSeconds }));
    setPickerOpen(false);
    reload();
  };

  const finish = async () => {
    setFinishOpen(false);
    if (notes.trim()) await updateWorkoutNotes(logId, notes.trim());
    const pauseBonus = pausedAt ? Date.now() - pausedAt : 0;
    const pausedMs = totalPausedMsRef.current + pauseBonus;
    await finishWorkout(logId, { pausedMs });
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
        <PrimaryActivityIndicator />
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

  const sessionMuscleDistribution = (() => {
    const counts: Partial<Record<MuscleGroup, number>> = {};
    for (const s of session.sets) {
      counts[s.primaryMuscle] = (counts[s.primaryMuscle] ?? 0) + (s.completed ? 1 : 0);
    }
    for (const s of session.sets) {
      if ((counts[s.primaryMuscle] ?? 0) === 0) counts[s.primaryMuscle] = 1;
    }
    return (Object.entries(counts) as [MuscleGroup, number][]).map(([muscle, sets]) => ({
      muscle,
      sets,
      volume: 0,
    }));
  })();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Discard workout" onPress={() => setDiscardOpen(true)} className="p-1">
          <Icon icon={X} size={24} color="muted-foreground" />
        </Pressable>
        <View className="items-center">
          <Body className="font-semibold text-foreground">{session.name}</Body>
          {pausedAt ? <Caption className="text-amber-500">Paused</Caption> : null}
        </View>
        <Button size="sm" variant="success" leftIcon={<Icon icon={Check} size={16} color="success-foreground" />} onPress={() => setFinishOpen(true)}>
          Finish
        </Button>
      </View>

      <View className="flex-row items-center justify-between px-4 py-3">
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
        <Pressable
          onPress={() => {
            const next = unit === 'metric' ? 'imperial' : 'metric';
            setUnit(next);
            toast({ title: `Units: ${next === 'metric' ? 'kg' : 'lb'}`, description: 'Weight display updated for this workout.' });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Toggle units, currently ${unit === 'metric' ? 'kg' : 'lb'}`}
          className="flex-1 items-center">
          <Caption>Volume · {unit === 'metric' ? 'kg' : 'lb'}</Caption>
          <Body className="mt-0.5 font-semibold text-foreground">{formatVolume(totalVolume, unit)}</Body>
        </Pressable>
        <View className="flex-1 items-center">
          <Caption>Sets</Caption>
          <Body className="mt-0.5 font-semibold text-foreground">{completedSets}/{totalSets}</Body>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ ...SCREEN_CONTENT_CTA, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        {sessionMuscleDistribution.length > 0 ? (
          <View className="mb-3 items-center rounded-3xl bg-card py-2">
            <MuscleBodyMap distribution={sessionMuscleDistribution} compact />
          </View>
        ) : null}

        <Button variant="outline" className="mb-3" leftIcon={<Icon icon={Plus} size={16} color="primary" />} onPress={() => setPickerOpen(true)}>
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
              <View key={g.exerciseId} ref={(el) => { groupRefs.current[i] = el; }}>
                {i > 0 && <View className="mb-5 h-px bg-border/40" />}
                <ExerciseBlock
                  name={g.exerciseName}
                  exerciseId={g.exerciseId}
                  sets={g.sets}
                  unit={unit}
                  lastSets={lastSetsMap[g.exerciseId] ?? []}
                  prSummary={prMap[g.exerciseId] ?? null}
                  restSeconds={restSecondsMap[g.exerciseId] ?? 0}
                  onChangeRestSeconds={(s) => onChangeRestSeconds(g.exerciseId, s)}
                  onChangeWeight={onChangeWeight}
                  onChangeReps={onChangeReps}
                  onToggleComplete={onToggleComplete}
                  onRemoveSet={onRemoveSet}
                  onAddSet={() => onAddSet(g.exerciseId)}
                  onAddWarmUp={() => onAddWarmUp(g.exerciseId)}
                  showWarmUpSets={showWarmUpSets}
                />
              </View>
            ))}
          </View>
        )}

        {session.sets.length > 0 ? (
          <View className="mt-5 mb-3 rounded-2xl bg-card p-3">
            <Caption className="mb-2 text-muted-foreground">Set rest for all exercises</Caption>
            <RestPresetBar onSelect={applyRestToAll} />
          </View>
        ) : null}

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

        <Pressable
          onPress={() => router.push('/(app)/plate-calculator' as Href)}
          className="mb-3 flex-row items-center gap-2 rounded-xl bg-card px-4 py-3">
          <Icon icon={METRIC_ICONS.equipment} size={16} color="primary" />
          <Body className="text-sm text-foreground">Plate calculator</Body>
        </Pressable>
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

      {rest.running || rest.remaining > 0 || rest.justFinished ? (
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
        description={
          completedSets < totalSets
            ? `You completed ${completedSets} of ${totalSets} sets — ${totalSets - completedSets} still open. Save this session to your history?`
            : `You completed ${completedSets} of ${totalSets} sets. Save this session to your history.`
        }
        footer={
          <>
            <Button variant="outline" onPress={() => setFinishOpen(false)}>Keep logging</Button>
            <Button variant="success" onPress={finish}>Finish &amp; save</Button>
          </>
        }
      />
      <DiscardSessionDialog open={discardOpen} onOpenChange={setDiscardOpen} onConfirm={discard} />

      <Sheet open={timerSheetOpen} onOpenChange={setTimerSheetOpen} title="Workout Timer" snapPoints={['25%', '75%']} dynamicSizing={false}>
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
