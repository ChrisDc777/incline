import { Pressable, View, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';

/**
 * Custom segmented control with animated sliding indicator.
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
  const selectedIndex = values.findIndex((v) => v.value === value);
  const [widths, setWidths] = useState<number[]>(values.map(() => 0));
  const [offsets, setOffsets] = useState<number[]>(values.map(() => 0));

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const onLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setWidths((prev) => {
      const next = [...prev];
      next[index] = width;
      return next;
    });
    setOffsets((prev) => {
      const next = [...prev];
      next[index] = x;
      return next;
    });
  };

  // Update indicator when selection changes
  if (offsets[selectedIndex] !== undefined && widths[selectedIndex] > 0) {
    indicatorX.value = withSpring(offsets[selectedIndex], { damping: 20, stiffness: 300 });
    indicatorWidth.value = withSpring(widths[selectedIndex], { damping: 20, stiffness: 300 });
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View className={cn('relative flex-row rounded-xl bg-card p-1', className)}>
      <Animated.View
        className="absolute top-1 bottom-1 rounded-lg bg-primary"
        style={[indicatorStyle, { left: 4 }]}
      />
      {values.map((v, i) => {
        const isSelected = v.value === value;
        return (
          <Pressable
            key={v.value}
            onPress={() => onChange(v.value)}
            onLayout={(e) => onLayout(i, e)}
            className="flex-1 items-center justify-center py-2"
            style={{ minHeight: 36, zIndex: 1 }}>
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
