import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useCallback } from 'react';

import { cn } from '@/lib/cn';
import { Text } from './text';

type CardProps = ViewProps & {
  elevation?: 'flat' | 'raised';
};

export function Card({ className, elevation = 'flat', ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-3xl border p-4',
        elevation === 'raised'
          ? 'border-border bg-surface2 shadow-sm'
          : 'border-border/60 bg-surface1',
        className,
      )}
      {...props}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableCardProps = PressableProps & {
  elevation?: 'flat' | 'raised';
  className?: string;
  children?: ReactNode;
};

/** Card with a subtle press-scale lift for list/feed rows. */
export function PressableCard({
  className,
  elevation = 'flat',
  children,
  disabled,
  ...props
}: PressableCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 420 });
  }, [scale]);

  return (
    <AnimatedPressable
      style={animatedStyle}
      className={cn(
        'rounded-3xl border p-4',
        elevation === 'raised'
          ? 'border-border bg-surface2 shadow-sm'
          : 'border-border/60 bg-surface1',
        disabled && 'opacity-50',
        className,
      )}
      disabled={disabled}
      accessibilityRole="button"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}>
      {children}
    </AnimatedPressable>
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('mb-3 flex-row items-center justify-between gap-2', className)} {...props} />;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <Text className={cn('text-lg font-semibold text-foreground', className)}>{children}</Text>;
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('mt-4 flex-row items-center gap-2', className)} {...props} />;
}
