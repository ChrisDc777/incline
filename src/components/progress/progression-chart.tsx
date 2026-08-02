import { memo } from 'react';
import { View, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  if (points.length < 2) {
    return <Text className="text-sm text-muted-foreground">Log a few sessions to see your trend.</Text>;
  }
  const data = points.map((p) => ({ value: p.weight, label: p.label }));
  return (
    <View className={cn('items-center', className)}>
      <LineChart
        data={data}
        height={160}
        width={300}
        thickness={2.5}
        color="#16a34a"
        hideDataPoints={points.length > 12}
        dataPointsColor="#16a34a"
        dataPointsRadius={3}
        areaChart
        startFillColor="rgba(22,163,74,0.25)"
        endFillColor="rgba(22,163,74,0.02)"
        yAxisTextStyle={{ fontSize: 10, color: isDark ? '#a1a1aa' : '#71717a' }}
        xAxisLabelTextStyle={{ fontSize: 9, color: isDark ? '#a1a1aa' : '#71717a' }}
        yAxisLabelWidth={38}
        xAxisLabelsHeight={16}
        rulesColor={isDark ? '#27272a' : '#f4f4f5'}
        showVerticalLines
        verticalLinesColor={isDark ? '#27272a' : '#e4e4e7'}
        adjustToWidth
        pointerConfig={{
          pointerStripHeight: 130,
          pointerLabelComponent: (items: { value: number }[]) => (
            <View className="-mt-8 items-center rounded-lg bg-foreground px-2 py-1">
              <Text className="text-xs font-semibold text-background">{formatWeight(items[0]?.value ?? 0, unit)}</Text>
            </View>
          ),
        }}
      />
    </View>
  );
});
