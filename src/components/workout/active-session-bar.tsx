import { useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, ChevronRight } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { formatClock } from '@/db/calc';

/**
 * Cross-tab mini bar shown above the tab bar whenever a workout is in progress.
 * Tapping resumes the active session. Elapsed time ticks every second while the
 * app is in the foreground.
 */
export function ActiveSessionBar({
  logId,
  name,
  startedAt,
  refetch,
  className,
}: {
  logId: number;
  name: string;
  startedAt: number;
  refetch?: () => void;
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
    <Pressable
      className={cn('mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-primary p-3 shadow-lg', className)}
      onPress={() => router.push(`/session/${logId}`)}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20">
        <Icon icon={Dumbbell} size={18} color="primary-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-primary-foreground">{name}</Text>
        <Text className="text-xs text-primary-foreground/80">In progress · {formatClock(elapsed)}</Text>
      </View>
      <Icon icon={ChevronRight} size={20} color="primary-foreground" />
    </Pressable>
  );
}
