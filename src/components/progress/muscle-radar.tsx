import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { RadarChart } from 'react-native-gifted-charts';

import { Caption } from '@/components/common/text';
import { cn } from '@/lib/cn';
import { MUSCLE_LABELS } from '@/lib/labels';
import { hexToRgba, useThemeHex } from '@/lib/theme';
import type { MuscleDistribution, MuscleGroup } from '@/db/types';

const SHORT: Partial<Record<MuscleGroup, string>> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hams',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Traps',
  full_body: 'Full',
};

/** Current vs previous period muscle set radar (replaces the donut). */
export const MuscleRadar = memo(function MuscleRadar({
  current,
  previous,
  className,
}: {
  current: MuscleDistribution[];
  previous: MuscleDistribution[];
  className?: string;
}) {
  const colors = useThemeHex();

  const { labels, currentValues, previousValues, maxValue, hasPrevious } = useMemo(() => {
    const totals = new Map<MuscleGroup, number>();
    for (const d of current) totals.set(d.muscle, (totals.get(d.muscle) ?? 0) + d.sets);
    for (const d of previous) totals.set(d.muscle, (totals.get(d.muscle) ?? 0) + d.sets);
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    // Radar needs ≥3 axes
    while (ranked.length < 3 && ranked.length > 0) {
      ranked.push(ranked[ranked.length - 1]!);
    }
    const axes = ranked.map(([m]) => m);
    const curMap = new Map(current.map((d) => [d.muscle, d.sets]));
    const prevMap = new Map(previous.map((d) => [d.muscle, d.sets]));
    const cur = axes.map((m) => curMap.get(m) ?? 0);
    const prev = axes.map((m) => prevMap.get(m) ?? 0);
    const max = Math.max(1, ...cur, ...prev);
    return {
      labels: axes.map((m) => SHORT[m] ?? MUSCLE_LABELS[m]),
      currentValues: cur,
      previousValues: prev,
      maxValue: max,
      hasPrevious: previous.some((d) => d.sets > 0),
    };
  }, [current, previous]);

  if (current.length === 0 && previous.length === 0) {
    return <Caption className={className}>No training data yet.</Caption>;
  }

  return (
    <View className={cn('items-center gap-3', className)}>
      <RadarChart
        data={hasPrevious ? undefined : currentValues}
        dataSet={hasPrevious ? [currentValues, previousValues] : undefined}
        labels={labels}
        maxValue={maxValue}
        noOfSections={4}
        chartSize={260}
        labelConfig={{
          fontSize: 11,
          stroke: colors.mutedForeground,
          fontWeight: '500',
        }}
        gridConfig={{
          stroke: colors.border,
          strokeWidth: 1,
          fill: 'transparent',
          opacity: 1,
        }}
        asterLinesConfig={{
          stroke: colors.border,
          strokeWidth: 1,
        }}
        polygonConfig={
          hasPrevious
            ? undefined
            : {
                stroke: colors.primary,
                strokeWidth: 2,
                fill: colors.primary,
                opacity: 0.35,
              }
        }
        polygonConfigArray={
          hasPrevious
            ? [
                {
                  stroke: colors.primary,
                  strokeWidth: 2,
                  fill: colors.primary,
                  opacity: 0.35,
                },
                {
                  stroke: colors.mutedForeground,
                  strokeWidth: 1.5,
                  fill: hexToRgba(colors.mutedForeground, 0.2),
                  opacity: 0.25,
                },
              ]
            : undefined
        }
        isAnimated
        animationDuration={600}
      />
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
          <Caption>This period</Caption>
        </View>
        {hasPrevious ? (
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.mutedForeground }} />
            <Caption>Previous</Caption>
          </View>
        ) : null}
      </View>
    </View>
  );
});
