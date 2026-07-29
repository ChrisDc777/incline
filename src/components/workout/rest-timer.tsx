import { Pressable, View } from 'react-native';
import { X, Plus, Minus } from 'lucide-react-native';

import { Icon } from '@/components/common/icon';
import { formatClock } from '@/db/calc';
import { ProgressRing } from '@/components/progress/progress-ring';
import { Text } from '@/components/ui/text';
import { RestPresetBar } from './rest-preset-bar';

/**
 * Floating rest-timer overlay shown after completing a set. Uses the
 * useRestTimer hook for the countdown; the ring reflects remaining/total.
 */
export function RestTimer({
  remaining,
  total,
  onAdd,
  onSkip,
  onPreset,
}: {
  remaining: number;
  total: number;
  onAdd: (delta: number) => void;
  onSkip: () => void;
  onPreset: (seconds: number) => void;
}) {
  const progress = total > 0 ? remaining / total : 0;
  const done = remaining <= 0;
  return (
    <View className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-card p-5 pb-8">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {done ? 'Rest complete' : 'Rest'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip rest" onPress={onSkip} className="p-1">
          <Icon icon={X} size={20} color="muted-foreground" />
        </Pressable>
      </View>

      <View className="mt-3 items-center">
        <ProgressRing progress={progress} size={140} color={done ? '#25ca62' : '#25ca62'}>
          <View className="items-center">
            <Text className="text-3xl font-bold tracking-tight text-foreground">{formatClock(remaining)}</Text>
            <Text className="text-xs text-muted-foreground">{done ? 'Go again' : 'remaining'}</Text>
          </View>
        </ProgressRing>
      </View>

      <View className="mt-4 flex-row items-center justify-center gap-3">
        <Pressable
          onPress={() => onAdd(-15)}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Subtract 15 seconds">
          <Icon icon={Minus} size={18} color="foreground" />
        </Pressable>
        <Pressable
          onPress={() => onAdd(15)}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Add 15 seconds">
          <Icon icon={Plus} size={18} color="foreground" />
        </Pressable>
      </View>

      <RestPresetBar className="mt-4" onSelect={onPreset} />
    </View>
  );
}
