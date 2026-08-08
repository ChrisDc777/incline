import { memo } from 'react';

import { SeriesAreaChart } from './series-area-chart';
import { formatWeight } from '@/db/calc';
import type { Unit } from '@/db/types';

/** Weight progression line chart for a single exercise. */
export const ProgressionChart = memo(function ProgressionChart({
  points,
  unit,
  className,
}: {
  points: { label: string; weight: number }[];
  unit: Unit;
  className?: string;
}) {
  return (
    <SeriesAreaChart
      className={className}
      points={points.map((p) => ({ label: p.label, value: p.weight }))}
      formatValue={(v) => formatWeight(v, unit)}
    />
  );
});
