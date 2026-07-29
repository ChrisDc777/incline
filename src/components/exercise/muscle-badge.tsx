import { Badge } from '@/components/ui/badge';
import { MUSCLE_LABELS } from '@/lib/labels';
import type { MuscleGroup } from '@/db/types';

/** Compact muscle group badge. */
export function MuscleBadge({ muscle, className }: { muscle: MuscleGroup; className?: string }) {
  return (
    <Badge variant="default" className={className}>
      {MUSCLE_LABELS[muscle]}
    </Badge>
  );
}
