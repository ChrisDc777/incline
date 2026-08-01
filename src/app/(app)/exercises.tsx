import { useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Caption } from '@/components/common/text';
import { SearchBar } from '@/components/common/search-bar';
import { FilterChips, type FilterOption } from '@/components/common/chip';
import { EmptyState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { ExerciseListItem } from '@/components/exercise/exercise-list-item';
import { useSearchExercises } from '@/hooks/use-data';
import { useDebounce } from '@/hooks/use-debounce';
import { MUSCLE_LABELS } from '@/lib/labels';
import type { MuscleGroup } from '@/db/types';

const MUSCLE_OPTIONS: FilterOption<MuscleGroup>[] = (
  ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'core'] as MuscleGroup[]
).map((m) => ({ value: m, label: MUSCLE_LABELS[m] }));

export default function ExercisesScreen() {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const debouncedQuery = useDebounce(query);

  const exercises = useSearchExercises(debouncedQuery, muscle ? { muscle } : undefined);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Heading>Exercises</Heading>
        <Caption className="mt-1">{exercises.data?.length ?? 0} exercises in library</Caption>
      </View>

      <FlashList
        data={exercises.data ?? []}
        renderItem={({ item }) => <ExerciseListItem exercise={item.exercise} />}
        keyExtractor={(item) => String(item.exercise.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListHeaderComponent={
          <View className="mb-3 gap-3">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search exercises..." />
            <FilterChips options={MUSCLE_OPTIONS} value={muscle} onChange={setMuscle} />
          </View>
        }
        ListEmptyComponent={
          exercises.loading ? (
            <ListSkeleton count={4} />
          ) : (
            <EmptyState
              icon={<Icon icon={SearchIcon} size={28} color="muted-foreground" />}
              title="No exercises found"
              description="Try a different search or filter."
              actionLabel="Clear"
              onAction={() => { setQuery(''); setMuscle(null); }}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
