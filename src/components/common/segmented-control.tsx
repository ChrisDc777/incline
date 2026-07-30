import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';

/**
 * Custom segmented control — no native tick marks, smooth animated indicator.
 */
export function SegmentedControl<T extends string>({
  values,
  value,
  onChange,
  className,
}: {
  values: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const selectedIndex = Math.max(0, values.findIndex((v) => v.value === value));

  return (
    <View className={cn('flex-row rounded-xl bg-card p-1', className)}>
      {values.map((v, i) => {
        const isSelected = v.value === value;
        return (
          <Pressable
            key={v.value}
            onPress={() => onChange(v.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-lg py-2',
              isSelected ? 'bg-primary' : 'bg-transparent',
            )}
            style={{ minHeight: 36 }}>
            <Text
              className={cn(
                'text-sm font-medium',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground',
              )}>
              {v.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
