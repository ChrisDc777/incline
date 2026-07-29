import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: ViewProps) {
  return <View className={cn('rounded-xl bg-muted', className)} {...props} />;
}
