import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { WorkoutFeedCard } from '@/components/workout/workout-feed-card';
import { CardSkeleton } from '@/components/common/skeleton';
import { getWorkoutFeedForDay } from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import type { FeedWorkoutLog } from '@/db/types';

/** Day detail: every completed workout for a calendar date, styled like the home feed. */
export default function DayScreen() {
  const { ms } = useLocalSearchParams<{ ms: string }>();
  const dayMs = Number(ms);
  const router = useRouter();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const [state, setState] = useState<{ ms: number; items: FeedWorkoutLog[] | null }>({ ms: dayMs, items: null });

  useEffect(() => {
    let active = true;
    getWorkoutFeedForDay(dayMs).then((logs) => {
      if (active) setState({ ms: dayMs, items: logs });
    });
    return () => {
      active = false;
    };
  }, [dayMs]);

  const items = state.ms === dayMs ? state.items : null;

  const dateLabel = new Date(dayMs).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} className="p-1">
          <Icon icon={ChevronLeft} size={24} color="muted-foreground" />
        </Pressable>
        <View className="flex-1">
          <Body className="text-lg font-semibold text-foreground">{dateLabel}</Body>
          {items ? (
            <Caption>{items.length} workout{items.length !== 1 ? 's' : ''}</Caption>
          ) : null}
        </View>
      </View>

      {items === null ? (
        <View className="px-4 pt-4">
          <CardSkeleton />
        </View>
      ) : items.length === 0 ? (
        <View className="items-center py-20 px-6">
          <Body className="font-semibold text-foreground">No workouts this day</Body>
          <Caption className="mt-1 text-center">Tap another date on the calendar to see its history.</Caption>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <WorkoutFeedCard
              log={item}
              unit={unit}
              profileName={profile?.name?.trim() || 'Athlete'}
              avatarUrl={profile?.avatarUrl}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
