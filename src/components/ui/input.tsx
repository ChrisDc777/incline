import { TextInput, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';

export function Input({ className, ...props }: TextInputProps) {
  return (
    <TextInput
      className={cn(
        'h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground',
        className,
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}
