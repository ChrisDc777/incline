import { Pressable, ScrollView } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';

export function Chip({
  label,
  selected,
  onPress,
  className,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={cn(
        'rounded-full border px-3.5 py-1.5',
        selected ? 'border-primary bg-primary' : 'border-border bg-transparent',
        className,
      )}>
      <Text className={cn('text-sm font-medium', selected ? 'text-primary-foreground' : 'text-muted-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

/** Horizontal, scrollable filter chip row with an "All" option. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  allLabel = 'All',
}: {
  options: FilterOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allLabel?: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}>
      <Chip label={allLabel} selected={value === null} onPress={() => onChange(null)} />
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}
