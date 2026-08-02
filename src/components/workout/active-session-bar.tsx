import { useEffect, useState } from 'react';
import { AppState, Pressable, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronUp, Trash2 } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/db/calc';

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
  const textColor = isDark ? 'text-white' : 'text-foreground';
  const subTextColor = isDark ? 'text-gray-400' : 'text-muted-foreground';
  const rippleColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const iconBg = isDark ? 'bg-[#3a3a3c]' : 'bg-muted';

  return (
    <View
      style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 9999 }}
      className={cn('flex-row items-center px-2 py-2 shadow-lg border border-border/50 bg-transparent', className)}>
      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        accessibilityRole="button"
        accessibilityLabel="Open workout"
        className={cn('h-10 w-10 items-center justify-center rounded-full', iconBg)}
        android_ripple={{ color: rippleColor }}>
        <Icon icon={ChevronUp} size={22} color={isDark ? 'white' : '#16a34a'} />
      </Pressable>

      <Pressable
        onPress={() => router.push(`/session/${logId}`)}
        className="flex-1 flex-row items-center gap-2.5 px-1"
        android_ripple={{ color: rippleColor }}>
        <View className="h-2.5 w-2.5 rounded-full bg-success" />
        <View className="flex-1">
          <Text className={cn('text-sm font-semibold', textColor)}>
            {displayName} {startedAt ? formatClock(elapsed) : ''}
          </Text>
          {nextExercise ? (
            <Text className={cn('text-xs', subTextColor)} numberOfLines={1}>{nextExercise}</Text>
          ) : null}
        </View>
      </Pressable>

      {onDiscard ? (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard workout"
          className={cn('h-10 w-10 items-center justify-center rounded-full', iconBg)}
          android_ripple={{ color: rippleColor }}>
          <Icon icon={Trash2} size={20} color="#ff3b30" />
        </Pressable>
      ) : null}
    </View>
  );
}
