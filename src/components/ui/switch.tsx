import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

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
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={cn('h-7 w-12 rounded-full p-0.5', value ? 'bg-primary' : 'bg-muted', disabled && 'opacity-50')}>
      <View
        className={cn(
          'h-6 w-6 rounded-full bg-white shadow-sm',
          value ? 'ml-auto' : 'ml-0',
        )}
      />
    </Pressable>
  );
}
