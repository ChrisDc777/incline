import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, Search as SearchIcon, Plus } from 'lucide-react-native';

import { Heading, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/common/segmented-control';
import { SearchBar } from '@/components/common/search-bar';
import { FilterChips, type FilterOption } from '@/components/common/chip';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { WorkoutCard } from '@/components/workout/workout-card';
import { ProgramCard } from '@/components/workout/program-card';
import { ExerciseListItem } from '@/components/exercise/exercise-list-item';
import { useTemplateSummaries, useSearchExercises, usePrograms } from '@/hooks/use-data';
import { MUSCLE_LABELS } from '@/lib/labels';
import type { MuscleGroup } from '@/db/types';

type Tab = 'templates' | 'exercises' | 'programs';

const MUSCLE_OPTIONS: FilterOption<MuscleGroup>[] = (
  ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'core'] as MuscleGroup[]
).map((m) => ({ value: m, label: MUSCLE_LABELS[m] }));

export default function WorkoutsScreen() {
  const [tab, setTab] = useState<Tab>('templates');
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const router = useRouter();

  const templates = useTemplateSummaries();
  const exercises = useSearchExercises(query, muscle ? { muscle } : undefined);
  const programs = usePrograms();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Heading>Workouts</Heading>
        <SegmentedControl<Tab>
          className="mt-3"
          value={tab}
          onChange={setTab}
          values={[
            { value: 'templates', label: 'Templates' },
            { value: 'exercises', label: 'Exercises' },
            { value: 'programs', label: 'Programs' },
          ]}
        />
      </View>

      {tab === 'templates' ? (
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <Button variant="outline" className="mb-3" leftIcon={<Plus size={16} className="text-primary" />} onPress={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })}>
              Create template
            </Button>
          }
          ListEmptyComponent={
            templates.loading ? (
              <ListSkeleton count={3} />
            ) : templates.error ? (
              <ErrorState onRetry={templates.refetch} />
            ) : (
              <EmptyState icon={<Dumbbell size={28} className="text-muted-foreground" />} title="No templates yet" description="Create your first workout template." actionLabel="Create" onAction={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })} />
            )
          }
        />
      ) : null}

      {tab === 'exercises' ? (
        <FlashList
          data={exercises.data ?? []}
          renderItem={({ item }) => <ExerciseListItem exercise={item.exercise} />}
          keyExtractor={(item) => String(item.exercise.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListHeaderComponent={
            <View className="mb-3 gap-3">
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search exercises, e.g. “bp” or “push”" />
              <FilterChips options={MUSCLE_OPTIONS} value={muscle} onChange={setMuscle} />
              <Caption>{exercises.data?.length ?? 0} exercises</Caption>
            </View>
          }
          ListEmptyComponent={
            exercises.loading ? (
              <ListSkeleton count={4} />
            ) : (
              <EmptyState icon={<SearchIcon size={28} className="text-muted-foreground" />} title="No exercises found" description="Try a different search or filter." actionLabel="Clear" onAction={() => { setQuery(''); setMuscle(null); }} />
            )
          }
        />
      ) : null}

      {tab === 'programs' ? (
        <FlashList
          data={programs.data ?? []}
          renderItem={({ item }) => <ProgramCard program={item} />}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            programs.loading ? <ListSkeleton count={2} /> : <EmptyState title="No programs yet" description="Training programs will appear here." />
          }
        />
      ) : null}
    </SafeAreaView>
  );
}
