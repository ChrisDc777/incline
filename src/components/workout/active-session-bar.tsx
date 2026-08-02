import { useEffect, useState } from 'react';
import { AppState, Pressable, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronUp, Trash2 } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { formatDuration } from '@/db/calc';

/**
 * Floating session bar shown above the tab bar when a workout is in progress.
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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
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
  const barBg = isDark ? 'bg-[#2c2c2e]' : 'bg-card';
  const textColor = isDark ? 'text-white' : 'text-foreground';
  const subTextColor = isDark ? 'text-gray-400' : 'text-muted-foreground';
  const rippleColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const iconBg = isDark ? 'bg-[#3a3a3c]' : 'bg-muted';

  return (
    <View
      style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 9999 }}
      className={cn('flex-row items-center px-3 py-3 shadow-lg border border-border/50', barBg, className)}>
      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        accessibilityRole="button"
        accessibilityLabel="Open workout"
        className={cn('h-14 w-14 items-center justify-center rounded-full', iconBg)}
        android_ripple={{ color: rippleColor }}>
        <Icon icon={ChevronUp} size={30} color={isDark ? 'white' : '#16a34a'} />
      </Pressable>

      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        className="flex-1 flex-row items-center px-2"
        android_ripple={{ color: rippleColor }}>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full bg-success" />
            <Text className={cn('text-base font-semibold', textColor)}>{displayName}</Text>
            {startedAt ? (
              <Text className={cn('text-base', subTextColor)}>{formatDuration(elapsed)}</Text>
            ) : null}
          </View>
          {nextExercise ? (
            <Text className={cn('text-base', subTextColor)} numberOfLines={1}>{nextExercise}</Text>
          ) : null}
        </View>
      </Pressable>

      {onDiscard ? (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard workout"
          className={cn('h-14 w-14 items-center justify-center rounded-full', iconBg)}
          android_ripple={{ color: rippleColor }}>
          <Icon icon={Trash2} size={28} color="#ff3b30" />
        </Pressable>
      ) : null}
    </View>
  );
}
