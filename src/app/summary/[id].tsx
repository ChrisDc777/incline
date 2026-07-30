import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Clock, Layers, Dumbbell, Trophy, Pencil, MessageSquare } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Hero, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { SummaryStat } from '@/components/workout/summary-stat';
import { NumberStepper } from '@/components/workout/number-stepper';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { getWorkoutLog, updateSet, updateWorkoutNotes, createTemplate, addExerciseToTemplate, type SessionWorkout, type SessionSet } from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import { formatDuration, formatFullDate, formatVolume, formatWeight, setVolume } from '@/db/calc';

interface Breakdown {
  exerciseId: number;
  exerciseName: string;
  completedSets: number;
  totalSets: number;
  volume: number;
  best: SessionSet;
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const router = useRouter();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const [log, setLog] = useState<SessionWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSet, setEditingSet] = useState<SessionSet | null>(null);
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    const s = await getWorkoutLog(logId);
    setLog(s);
    if (s) setNotes(s.notes ?? '');
    setLoading(false);
  }, [logId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (log && !log.isComplete) router.replace(`/session/${log.id}`);
  }, [log, router]);

  const breakdown = useMemo<Breakdown[]>(() => {
    const map = new Map<number, Breakdown>();
    for (const s of log?.sets ?? []) {
      let b = map.get(s.exerciseId);
      if (!b) {
        b = {
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          completedSets: 0,
          totalSets: 0,
          volume: 0,
          best: s,
        };
        map.set(s.exerciseId, b);
      }
      b.totalSets++;
      if (s.completed) {
        b.completedSets++;
        b.volume += setVolume(s.weight, s.reps);
        if (setVolume(s.weight, s.reps) > setVolume(b.best.weight, b.best.reps)) b.best = s;
      }
    }
    return [...map.values()];
  }, [log]);

  const openEditSet = (set: SessionSet) => {
    setEditingSet(set);
    setEditWeight(set.weight);
    setEditReps(set.reps);
  };

  const saveSetEdit = async () => {
    if (!editingSet) return;
    await updateSet(editingSet.id, { weight: editWeight, reps: editReps });
    impact();
    setEditingSet(null);
    reload();
  };

  const saveAsTemplate = async () => {
    if (!log) return;
    setSavingTemplate(true);
    try {
      const exerciseIds = [...new Set(log.sets.map((s) => s.exerciseId))];
      const templateId = await createTemplate(
        log.name,
        `Saved from workout on ${formatFullDate(log.startedAt)}`,
        profile?.goal === 'build_muscle' ? 'beginner' : profile?.goal === 'improve_endurance' ? 'intermediate' : 'intermediate',
      );
      for (const exId of exerciseIds) {
        const exSets = log.sets.filter((s) => s.exerciseId === exId);
        const best = exSets.reduce((a, b) => (a.weight > b.weight ? a : b), exSets[0]);
        await addExerciseToTemplate(templateId, exId, exSets.length, best.reps, best.reps, 90);
      }
      impact();
      toast({ title: 'Template saved', description: 'Find it in your templates.', variant: 'success' });
      router.replace(`/workout/${templateId}`);
    } catch {
      toast({ title: 'Could not save template', variant: 'destructive' });
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <ActivityIndicator color="#16a34a" />
      </SafeAreaView>
    );
  if (!log) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6" edges={['bottom']}>
        <Body className="text-center font-semibold text-foreground">Workout not found</Body>
        <Caption className="mt-2 text-center">This session may have been deleted.</Caption>
        <Button className="mt-4" onPress={() => router.replace('/(app)/(tabs)')}>Go home</Button>
      </SafeAreaView>
    );
  }

  const completedSets = log.sets.filter((s) => s.completed).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="items-center pt-6">
          <LinearGradient colors={['#16a34a', '#22c55e']} className="h-16 w-16 items-center justify-center rounded-3xl shadow-lg">
            <Icon icon={Check} size={32} color="success-foreground" />
          </LinearGradient>
          <Hero className="mt-4">Workout complete</Hero>
          <Caption className="mt-1">{formatFullDate(log.startedAt)}</Caption>
        </View>

        <View className="mt-6 flex-row gap-3">
          <SummaryStat label="Duration" value={formatDuration(log.durationSeconds)} icon={<Icon icon={Clock} size={20} color="primary" />} />
          <SummaryStat label="Volume" value={formatVolume(log.totalVolume, unit)} icon={<Icon icon={Layers} size={20} color="info" />} />
          <SummaryStat label="Sets" value={`${completedSets}`} icon={<Icon icon={Dumbbell} size={20} color="warning" />} />
        </View>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Exercise breakdown</CardTitle>
            <Pressable onPress={() => {
              const first = log.sets.find((s) => s.completed);
              if (first) openEditSet(first);
            }} className="flex-row items-center gap-1">
              <Icon icon={Pencil} size={14} color="primary" />
              <Caption className="text-primary">Edit sets</Caption>
            </Pressable>
          </CardHeader>
          <View className="gap-2">
            {breakdown.map((b) => (
              <Pressable key={b.exerciseId} onPress={() => openEditSet(b.best)} className="flex-row items-center justify-between rounded-lg py-1">
                <View className="flex-1">
                  <Body className="font-medium text-foreground">{b.exerciseName}</Body>
                  <Caption>
                    {b.completedSets}/{b.totalSets} sets · {formatVolume(b.volume, unit)}
                  </Caption>
                </View>
                <Badge variant="default">
                  {formatWeight(b.best.weight, unit)} × {b.best.reps}
                </Badge>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <Icon icon={MessageSquare} size={16} color="primary" />
          </CardHeader>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={() => updateWorkoutNotes(logId, notes.trim())}
            placeholder="How did this session feel?"
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80, fontSize: 14, lineHeight: 20 }}
          />
        </Card>

        <LinearGradient colors={['#16a34a15', '#22c55e15']} className="mt-5 flex-row items-center gap-3 rounded-xl p-3">
          <Icon icon={Trophy} size={20} color="primary" />
          <Body className="flex-1 text-sm text-foreground">Keep showing up — consistency builds strength.</Body>
        </LinearGradient>

        <Button
          variant="outline"
          className="mt-5"
          onPress={saveAsTemplate}
          disabled={savingTemplate}>
          {savingTemplate ? 'Saving...' : 'Save as template'}
        </Button>

        <Button size="lg" className="mt-3" onPress={() => router.replace('/(app)/(tabs)')}>
          Done
        </Button>
      </ScrollView>

      <Dialog
        open={!!editingSet}
        onOpenChange={(open) => { if (!open) setEditingSet(null); }}
        title={editingSet?.exerciseName ?? 'Edit set'}
        footer={
          <>
            <Button variant="outline" onPress={() => setEditingSet(null)}>Cancel</Button>
            <Button onPress={saveSetEdit}>Save</Button>
          </>
        }>
        {editingSet && (
          <View className="gap-4 py-2">
            <View className="flex-row items-center justify-between">
              <Body>Weight</Body>
              <NumberStepper value={editWeight} onChange={setEditWeight} step={2.5} suffix={unit === 'metric' ? 'kg' : 'lb'} decimals={1} />
            </View>
            <View className="flex-row items-center justify-between">
              <Body>Reps</Body>
              <NumberStepper value={editReps} onChange={setEditReps} step={1} suffix="reps" />
            </View>
          </View>
        )}
      </Dialog>
    </SafeAreaView>
  );
}
