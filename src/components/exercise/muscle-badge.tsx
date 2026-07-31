import { Badge } from '@/components/ui/badge';
import { MUSCLE_LABELS } from '@/lib/labels';
import type { MuscleGroup } from '@/db/types';

/** Compact muscle group badge. */
export function MuscleBadge({ muscle, className }: { muscle: MuscleGroup | string; className?: string }) {
  const label = MUSCLE_LABELS[muscle as MuscleGroup] ?? muscle;
  return (
    <Badge variant="default" className={className}>
      {label}
    </Badge>
  );
}
