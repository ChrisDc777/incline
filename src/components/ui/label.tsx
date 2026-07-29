import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Text } from './text';

export function Label({ className, children }: { className?: string; children: ReactNode }) {
  return <Text className={cn('text-sm font-medium text-foreground', className)}>{children}</Text>;
}
