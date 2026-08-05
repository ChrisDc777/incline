import { memo } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useThemeHex } from '@/lib/theme';
import { useAppColorScheme } from '@/lib/use-color-scheme';
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
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const colors = useThemeHex();
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
        color={colors.primary}
        hideDataPoints={points.length > 12}
        dataPointsColor={colors.primary}
        dataPointsRadius={3}
        areaChart
        startFillColor={`${colors.primary}40`}
        endFillColor={`${colors.primary}05`}
        yAxisTextStyle={{ fontSize: 10, color: colors.mutedForeground }}
        xAxisLabelTextStyle={{ fontSize: 9, color: colors.mutedForeground }}
        yAxisLabelWidth={38}
        xAxisLabelsHeight={16}
        rulesColor={isDark ? '#27272a' : '#f4f4f5'}
        showVerticalLines
        verticalLinesColor={colors.border}
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
