import { useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Trash2 } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/db/calc';

/**
 * Cross-tab mini bar shown above the tab bar whenever a workout is in progress.
 * Left: dumbbell icon. Center: elapsed time + next exercise. Right: trash icon.
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
  name: string;
  startedAt: number;
  nextExercise?: string;
  refetch?: () => void;
  onDiscard?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
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

  return (
    <View className={cn('mx-4 mb-2 flex-row items-center rounded-2xl bg-primary shadow-lg', className)}>
      <Pressable
        className="flex-1 flex-row items-center gap-3 p-3"
        onPress={() => router.push(`/session/${logId}`)}
        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}>
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20">
          <Icon icon={Dumbbell} size={18} color="primary-foreground" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-primary-foreground">{formatClock(elapsed)}</Text>
          {nextExercise ? (
            <Text className="text-xs text-primary-foreground/70" numberOfLines={1}>{nextExercise}</Text>
          ) : null}
        </View>
      </Pressable>
      {onDiscard ? (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard workout"
          className="h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/10 mr-1.5">
          <Icon icon={Trash2} size={18} color="primary-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
