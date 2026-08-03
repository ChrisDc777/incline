import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { useAppColorScheme } from '@/lib/use-color-scheme';

const TRACK_W = 48;
const THUMB_W = 24;
const PADDING = 2;
const TRAVEL = TRACK_W - THUMB_W - PADDING * 2;

const PRIMARY_LIGHT = '#16a34a';
const PRIMARY_DARK = '#22c55e';
const MUTED_LIGHT = '#f4f4f5';
const MUTED_DARK = '#27272a';

export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const isDark = useAppColorScheme() === 'dark';
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 22, stiffness: 320 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [isDark ? MUTED_DARK : MUTED_LIGHT, isDark ? PRIMARY_DARK : PRIMARY_LIGHT],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={cn('h-7 w-12 p-0.5', disabled && 'opacity-50')}>
      <Animated.View style={[trackStyle, { flex: 1, borderRadius: 999 }]}>
        <Animated.View
          style={[
            thumbStyle,
            {
              height: THUMB_W,
              width: THUMB_W,
              borderRadius: 999,
              backgroundColor: 'white',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 3,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
