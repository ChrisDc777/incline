import { useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronUp, Trash2 } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/db/calc';

/**
 * Floating session bar shown above the tab bar when a workout is in progress.
 * Dark charcoal background, green status dot, chevron left, trash right.
 * Matches reference app style.
 */
export function ActiveSessionBar({
  logId,
  name,
  startedAt,
  nextExercise,
  refetch,
  onDiscard,
  className,
}: {
  logId: number;
  name?: string;
  startedAt?: number;
  nextExercise?: string;
  refetch?: () => void;
  onDiscard?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0));

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  useEffect(() => {
    if (!refetch) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const displayName = name ?? 'Workout';

  return (
    <View className={cn('mx-4 mb-2 flex-row items-center rounded-2xl bg-[#1c1c1e] px-2 py-2 shadow-lg', className)}>
      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        accessibilityRole="button"
        accessibilityLabel="Open workout"
        className="h-10 w-10 items-center justify-center rounded-xl"
        android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
        <Icon icon={ChevronUp} size={22} color="white" />
      </Pressable>

      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        className="flex-1 flex-row items-center gap-2.5 px-1"
        android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
        <View className="h-2.5 w-2.5 rounded-full bg-success" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-white">
            {displayName} {startedAt ? formatClock(elapsed) : ''}
          </Text>
          {nextExercise ? (
            <Text className="text-xs text-gray-400" numberOfLines={1}>{nextExercise}</Text>
          ) : null}
        </View>
      </Pressable>

      {onDiscard ? (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard workout"
          className="h-10 w-10 items-center justify-center rounded-xl"
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
          <Icon icon={Trash2} size={20} color="#ff3b30" />
        </Pressable>
      ) : null}
    </View>
  );
}
