import { useLayoutEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, type Href } from 'expo-router';
import { Clock, Dumbbell, Play } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { MuscleBadge } from '@/components/exercise/muscle-badge';
import { ActiveSessionConflictDialog } from '@/components/workout/active-session-conflict-dialog';
import { useTemplate } from '@/hooks/use-data';
import { useActiveSession } from '@/hooks/use-active-session';
import { useActiveWorkout } from '@/store/active-workout-store';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { startWorkout, discardWorkout } from '@/db/queries';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS } from '@/lib/labels';
import type { MuscleGroup } from '@/db/types';

export default function WorkoutPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const { data: template, loading, error, refetch } = useTemplate(templateId);
  const { session } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const [starting, setStarting] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, title: 'Workout' });
  }, [navigation]);

  const doStart = async () => {
    if (!template) return;
    setStarting(true);
    impact();
    try {
      const logId = await startWorkout(template.id, template.name);
      useActiveWorkout.getState().setActive(logId);
      router.replace(`/session/${logId}`);
    } catch {
      toast({ title: 'Could not start workout', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const start = async () => {
    if (session) {
      setConflictOpen(true);
      return;
    }
    await doStart();
  };

  const resumeActive = () => {
    setConflictOpen(false);
    if (session) router.push(`/session/${session.id}`);
  };

  const startNewAndDiscard = async () => {
    setConflictOpen(false);
    if (session) {
      await discardWorkout(session.id);
      clear();
    }
    await doStart();
  };

  if (loading) return <ListSkeleton count={2} />;
  if (error || !template) return <ErrorState onRetry={refetch} title="Workout not found" />;

  const muscles = (template.exercises ?? [])
    .map((e) => e.exercise?.primaryMuscle)
    .filter((m, i, arr): m is MuscleGroup => !!m && arr.indexOf(m) === i);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
      <Caption>Workout routine</Caption>
      <Heading className="mt-1">{template.name}</Heading>
      <Body className="mt-2 text-muted-foreground">{template.description}</Body>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Badge variant="outline">{DIFFICULTY_LABELS[template.difficulty]}</Badge>
        <Badge variant="outline">{template.estimatedMinutes} min</Badge>
        <Badge variant="outline">{template.exercises?.length ?? 0} exercises</Badge>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {muscles.map((m) => (
          <MuscleBadge key={m} muscle={m} />
        ))}
      </View>

      <View className="mt-6 gap-3">
        {(template.exercises ?? []).map((te) => (
          <Card key={te.id}>
            <View className="flex-row items-center justify-between">
              <Body className="flex-1 font-semibold text-foreground">{te.exercise?.name ?? 'Exercise'}</Body>
              <Badge variant="secondary">
                {te.targetSets} × {te.targetRepsMin}
                {te.targetRepsMax !== te.targetRepsMin ? `–${te.targetRepsMax}` : ''}
              </Badge>
            </View>
            <View className="mt-2 flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Icon icon={Dumbbell} size={13} color="muted-foreground" />
                <Caption>{te.exercise?.equipment ? EQUIPMENT_LABELS[te.exercise.equipment] : ''}</Caption>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon icon={Clock} size={13} color="muted-foreground" />
                <Caption>{te.restSeconds}s rest</Caption>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-5 pb-8 shadow-xl">
        <Button size="lg" leftIcon={<Icon icon={Play} size={18} color="primary-foreground" />} onPress={start} disabled={starting}>
          {starting ? 'Starting…' : 'Start workout'}
        </Button>
        <Button variant="outline" className="mt-2" onPress={() => router.push({ pathname: '/(app)/template/[id]', params: { id: String(templateId) } } as Href)}>
          Edit routine
        </Button>
      </View>

      <ActiveSessionConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        onResume={resumeActive}
        onStartNew={startNewAndDiscard}
      />
    </ScrollView>
  );
}
