import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Text } from './text';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-transparent',
      ghost: 'bg-transparent',
      success: 'bg-success',
    },
    size: {
      default: 'h-11 px-5',
      sm: 'h-9 px-3',
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
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
      disabled={disabled}
      accessibilityRole="button"
      {...props}>
      {leftIcon}
      {typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClass)}>{children}</Text>
      ) : (
        children
      )}
      {rightIcon}
    </Pressable>
  );
}

export { buttonVariants, buttonTextVariants };
