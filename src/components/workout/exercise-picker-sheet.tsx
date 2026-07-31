import { useState, useEffect, useCallback } from 'react';
import { Pressable, View, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Plus } from 'lucide-react-native';

import { Sheet } from '@/components/ui/sheet';
import { SearchBar } from '@/components/common/search-bar';
import { CreateExerciseForm } from '@/components/exercise/create-exercise-form';
import { EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { fetchExercisesFromSupabase, searchExercisesFromSupabase, type SupabaseExercise } from '@/lib/supabase';
import { ensureExerciseExists } from '@/db/queries';
import type { Exercise } from '@/db/types';

/** Convert a Supabase exercise to the local Exercise type for workout logging. */
function toLocalExercise(ex: SupabaseExercise): Exercise {
  return {
    id: 0, // will be set by ensureExerciseExists
    name: ex.name,
    aliases: [],
    primaryMuscle: ex.target_muscle as Exercise['primaryMuscle'],
    secondaryMuscles: (ex.secondary_muscles ?? []) as Exercise['secondaryMuscles'],
    movementPattern: ex.movement_pattern as Exercise['movementPattern'],
    equipment: ex.equipment as Exercise['equipment'],
    category: ex.category as Exercise['category'],
    isCompound: ex.is_compound,
    isCustom: false,
    source: 'exercisedb',
    externalId: ex.external_id,
    difficulty: ex.difficulty,
    defaultRestSeconds: 90,
    instructions: ex.instructions ?? [],
    tips: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Modal sheet to pick an exercise — fetches from Supabase (ExerciseDB data). */
export function ExercisePickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<SupabaseExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const BATCH = 50;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExercisesFromSupabase(BATCH, 0);
      setItems(data);
      setOffset(data.length);
      setHasMore(data.length === BATCH);
    } catch {
      setError('Could not load exercises. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await fetchExercisesFromSupabase(BATCH, offset);
      setItems((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === BATCH);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [loading, hasMore, offset]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      loadInitial();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchExercisesFromSupabase(q);
      setItems(data);
      setHasMore(false);
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [loadInitial]);

  // Load initial data when sheet opens
  useEffect(() => {
    if (open && !creating) {
      loadInitial();
    }
  }, [open, creating, loadInitial]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handlePick = async (ex: SupabaseExercise) => {
    // Save to local SQLite so workout logging works
    const local = toLocalExercise(ex);
    const localId = await ensureExerciseExists(local, ex.external_id);
    onPick({ ...local, id: localId });
    onOpenChange(false);
    setQuery('');
  };

  const handleCreated = () => {
    setCreating(false);
    loadInitial();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={creating ? 'Create exercise' : 'Add exercise'} snapPoints={['75%', '95%']} scroll>
      {creating ? (
        <CreateExerciseForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
      ) : (
        <>
          <Button
            variant="outline"
            className="mb-3"
            leftIcon={<Icon icon={Plus} size={16} color="primary" />}
            onPress={() => setCreating(true)}>
            Create custom exercise
          </Button>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search exercises" className="mb-3" />
          <View style={{ minHeight: 300, maxHeight: 500 }}>
            {error ? (
              <EmptyState title="Error" description={error} />
            ) : items.length === 0 && !loading ? (
              <EmptyState title="No exercises found" description="Try a different search or create a custom exercise." />
            ) : (
              <FlashList
                data={items}
                renderItem={({ item }) => (
                  <Pressable onPress={() => handlePick(item)}>
                    <View className="mb-2">
                      <View className="flex-row items-center gap-3 rounded-3xl bg-card p-4">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                          <Text className="mt-0.5 text-xs text-muted-foreground">
                            {item.target_muscle} · {item.equipment}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}
                keyExtractor={(item) => item.external_id}
                ItemSeparatorComponent={() => <View className="h-2" />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loading ? <ActivityIndicator className="py-4" color="#16a34a" /> : null
                }
              />
            )}
          </View>
        </>
      )}
    </Sheet>
  );
}
