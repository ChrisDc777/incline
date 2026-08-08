import { memo } from 'react';

import { SeriesAreaChart } from './series-area-chart';
import { formatWeight } from '@/db/calc';
import type { Unit } from '@/db/types';

/** Weight progression area chart for a single exercise. */
export const ProgressionChart = memo(function ProgressionChart({
  points,
  unit,
  title = 'Heaviest weight',
  className,
}: {
  points: { label: string; weight: number }[];
  unit: Unit;
  title?: string;
  className?: string;
}) {
  return (
    <SeriesAreaChart
      className={className}
      title={title}
      points={points.map((p) => ({ label: p.label, value: p.weight }))}
      formatValue={(v) => formatWeight(v, unit)}
      valueHint={unit === 'metric' ? 'kg' : 'lb'}
    />
  );
});
