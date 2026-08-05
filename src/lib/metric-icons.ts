/**
 * Semantic icon map so the same concept always uses the same Lucide glyph.
 * Keep Dumbbell for the Workouts tab / exercise-fallback thumb only.
 */
import {
  CalendarCheck,
  Flame,
  Layers,
  ListChecks,
  Weight,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export const METRIC_ICONS = {
  sessions: CalendarCheck,
  sets: ListChecks,
  volume: Layers,
  streak: Flame,
  equipment: Weight,
  warmUp: Zap,
} as const satisfies Record<string, LucideIcon>;

export type MetricIconKey = keyof typeof METRIC_ICONS;
