import { History } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { formatWeight } from '@/db/calc';
import type { Unit } from '@/db/types';
import type { SetEntry } from '@/db/types';

/** Shows the carry-over values from the last completed workout for an exercise. */
export function PreviousBestBadge({
  lastSets,
  unit,
  className,
}: {
  lastSets: SetEntry[];
  unit: Unit;
  className?: string;
}) {
  if (lastSets.length === 0) return null;
  const top = lastSets.reduce((best, s) => (s.weight > best.weight ? s : best), lastSets[0]);
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <History size={13} className="text-muted-foreground" />
      <Text className="text-xs text-muted-foreground">
        Last: {formatWeight(top.weight, unit)} × {top.reps}
      </Text>
    </View>
  );
}
