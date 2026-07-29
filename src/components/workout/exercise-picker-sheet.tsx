import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Sheet } from '@/components/ui/sheet';
import { SearchBar } from '@/components/common/search-bar';
import { ExerciseListItem } from '@/components/exercise/exercise-list-item';
import { EmptyState } from '@/components/common/states';
import { useExercises } from '@/hooks/use-data';
import type { Exercise } from '@/db/types';

/** Modal sheet to pick an exercise to add to the active session. */
export function ExercisePickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
}) {
  const { data, loading } = useExercises();
  const [query, setQuery] = useState('');
  const items = (data ?? []).filter((e) =>
    query
      ? e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.aliases.some((a) => a.includes(query.toLowerCase()))
      : true,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add exercise">
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search exercises" className="mb-3" />
      <View style={{ height: 360 }}>
        {items.length === 0 && !loading ? (
          <EmptyState title="No exercises found" description="Try a different search." />
        ) : (
          <FlashList
            data={items}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onPick(item); onOpenChange(false); setQuery(''); }}>
                <ExerciseListItem exercise={item} className="mb-2" />
              </Pressable>
            )}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View className="h-2" />}
          />
        )}
      </View>
    </Sheet>
  );
}
