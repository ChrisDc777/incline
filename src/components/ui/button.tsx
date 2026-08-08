import { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Text } from './text';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      destructiveTonal: 'border border-destructive/30 bg-destructive/10',
      tonal: 'border border-primary/25 bg-primary/10',
      outline: 'border border-border bg-transparent',
      ghost: 'bg-transparent',
      success: 'bg-success',
    },
    size: {
      default: 'h-11 px-5',
      sm: 'h-11 min-h-[44px] px-4',
      lg: 'h-12 px-7',
      icon: 'h-11 w-11',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      destructiveTonal: 'text-destructive',
      tonal: 'text-primary',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      success: 'text-success-foreground',
    },
    size: { default: 'text-base', sm: 'text-sm', lg: 'text-lg', icon: '' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children?: ReactNode;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    textClass?: string;
  };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function asButtonLabel(children: ReactNode): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')) {
    return children.join('');
  }
  return null;
}

export function Button({
  className,
  variant,
  size,
  textClass,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const label = asButtonLabel(children);

  return (
    <AnimatedPressable
      style={animatedStyle}
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
      disabled={disabled}
      accessibilityRole="button"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}>
      {leftIcon}
      {label != null ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClass)}>{label}</Text>
      ) : (
        children
      )}
      {rightIcon}
    </AnimatedPressable>
  );
}

export { buttonVariants, buttonTextVariants };
