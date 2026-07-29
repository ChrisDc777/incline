import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

/** Icon inside a rounded tinted container. Used for stat tiles and CTAs. */
export function IconBadge({
  children,
  className,
  size = 'md',
}: {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  return (
    <View className={cn('items-center justify-center rounded-2xl bg-primary/15', dims, className)}>
      {children}
    </View>
  );
}
