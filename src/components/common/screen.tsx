import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

/**
 * Standard scrollable screen container with consistent horizontal padding and
 * safe-area handling. The footer bar lives outside the scroll for fixed CTAs.
 */
export function Screen({
  children,
  className,
  edges = ['top'],
}: {
  children: ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      <View className={cn('flex-1 px-5', className)}>{children}</View>
    </SafeAreaView>
  );
}

/** Non-scrollable variant for stacks that manage their own scroll. */
export function ScreenBody({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('flex-1 px-5', className)}>{children}</View>;
}
