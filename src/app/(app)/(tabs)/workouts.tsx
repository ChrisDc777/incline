import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, Plus } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/common/segmented-control';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { WorkoutCard } from '@/components/workout/workout-card';
import { ProgramCard } from '@/components/workout/program-card';
import { useTemplateSummaries, usePrograms } from '@/hooks/use-data';
import { useActiveSession } from '@/hooks/use-active-session';
import { useActiveWorkout } from '@/store/active-workout-store';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { startWorkout, discardWorkout } from '@/db/queries';

type Tab = 'routines' | 'programs';

export default function WorkoutsScreen() {
  const [tab, setTab] = useState<Tab>('routines');
  const router = useRouter();
  const templates = useTemplateSummaries();
  const programs = usePrograms();
  const { session } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const { toast } = useToast();
  const { impact } = useHaptics();
  const [conflictOpen, setConflictOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const startEmpty = async () => {
    setStarting(true);
    impact();
    try {
      const logId = await startWorkout(null, 'Empty Workout');
      useActiveWorkout.getState().setActive(logId);
      router.push(`/session/${logId}`);
    } catch {
      toast({ title: 'Could not start workout', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const handleStartEmpty = () => {
    if (session) {
      setConflictOpen(true);
      return;
    }
    startEmpty();
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
    await startEmpty();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Heading>Workouts</Heading>
        <SegmentedControl<Tab>
          className="mt-3"
          value={tab}
          onChange={setTab}
          values={[
            { value: 'routines', label: 'Routines' },
            { value: 'programs', label: 'Programs' },
          ]}
        />
      </View>

      {tab === 'routines' ? (
        <FlashList
          data={templates.data ?? []}
          renderItem={({ item }) => (
            <WorkoutCard
              id={item.template.id}
              name={item.template.name}
              description={item.template.description}
              difficulty={item.template.difficulty}
              estimatedMinutes={item.template.estimatedMinutes}
              exerciseCount={item.exerciseCount}
              muscleFocus={item.muscleFocus}
            />
          )}
          keyExtractor={(item) => String(item.template.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <View className="mb-3 gap-3">
              <Button variant="outline" leftIcon={<Icon icon={Dumbbell} size={16} color="primary" />} onPress={handleStartEmpty} disabled={starting}>
                {starting ? 'Starting…' : 'Start Empty Workout'}
              </Button>
              <Button variant="outline" leftIcon={<Icon icon={Plus} size={16} color="primary" />} onPress={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })}>
                Create New Routine
              </Button>
            </View>
          }
          ListEmptyComponent={
            templates.loading ? (
              <ListSkeleton count={3} />
            ) : templates.error ? (
              <ErrorState onRetry={templates.refetch} />
            ) : (
              <EmptyState icon={<Icon icon={Dumbbell} size={28} color="muted-foreground" />} title="No routines yet" description="Create your first workout routine." actionLabel="Create" onAction={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })} />
            )
          }
        />
      ) : null}

      {tab === 'programs' ? (
        <FlashList
          data={programs.data ?? []}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/(app)/program/[id]' as any, params: { id: String(item.id) } })}>
              <ProgramCard program={item} />
            </Pressable>
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            programs.loading ? <ListSkeleton count={2} /> : <EmptyState title="No programs yet" description="Training programs will appear here." />
          }
        />
      ) : null}

      <Dialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="You have a workout in progress"
        description="If you start a new workout, your old workout will be permanently deleted."
        footer={
          <View className="w-full gap-2">
            <Button onPress={resumeActive}>Resume workout in progress</Button>
            <Button variant="destructive" onPress={startNewAndDiscard}>Start new workout</Button>
            <Button variant="outline" onPress={() => setConflictOpen(false)}>Cancel</Button>
          </View>
        }
      />
    </SafeAreaView>
  );
}
