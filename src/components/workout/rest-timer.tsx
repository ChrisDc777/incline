import { Pressable, View } from 'react-native';

import { formatClock } from '@/db/calc';
import { Text } from '@/components/ui/text';

/**
 * Compact rest-timer bar shown at the bottom of the session screen.
 * Displays: [-15] [time] [+15] [Skip]
 */
export function RestTimer({
  remaining,
  total,
  onAdd,
  onSkip,
}: {
  remaining: number;
  total: number;
  onAdd: (delta: number) => void;
  onSkip: () => void;
}) {
  const done = remaining <= 0 && total > 0;

  return (
    <View
      className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-3 pb-6"
      style={{ elevation: 12 }}>
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => onAdd(-15)}
          accessibilityRole="button"
          accessibilityLabel="Subtract 15 seconds"
          className="h-11 w-14 items-center justify-center rounded-xl bg-muted">
          <Text className="text-lg font-semibold text-foreground">-15</Text>
        </Pressable>

        <View className="items-center px-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            {formatClock(remaining)}
          </Text>
          <Text className="text-[10px] text-muted-foreground">
            {done ? 'Done' : 'remaining'}
          </Text>
        </View>

        <Pressable
          onPress={() => onAdd(15)}
          accessibilityRole="button"
          accessibilityLabel="Add 15 seconds"
          className="h-11 w-14 items-center justify-center rounded-xl bg-muted">
          <Text className="text-lg font-semibold text-foreground">+15</Text>
        </Pressable>

        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
          className="h-11 items-center justify-center rounded-xl bg-primary px-4">
          <Text className="text-sm font-semibold text-primary-foreground">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
