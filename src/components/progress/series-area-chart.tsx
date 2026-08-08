import { memo } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/text';
import { Caption } from '@/components/common/text';
import { cn } from '@/lib/cn';
import { useThemeHex } from '@/lib/theme';

/** Area line series with peak caption — used for 1RM, set volume, weight progression. */
export const SeriesAreaChart = memo(function SeriesAreaChart({
  points,
  formatValue,
  emptyLabel = 'Log a few sessions to see your trend.',
  className,
}: {
  points: { label: string; value: number }[];
  formatValue: (v: number) => string;
  emptyLabel?: string;
  className?: string;
}) {
  const colors = useThemeHex();
  if (points.length < 2) {
    return <Text className="text-sm text-muted-foreground">{emptyLabel}</Text>;
  }
  const peak = Math.max(...points.map((p) => p.value));
  const data = points.map((p) => ({ value: p.value, label: p.label }));
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
        dataPointsRadius={3.5}
        areaChart
        curved
        startFillColor={`${colors.primary}40`}
        endFillColor={`${colors.primary}05`}
        yAxisTextStyle={{ fontSize: 10, color: colors.mutedForeground }}
        xAxisLabelTextStyle={{ fontSize: 9, color: colors.mutedForeground }}
        yAxisLabelWidth={38}
        xAxisLabelsHeight={16}
        rulesColor={colors.border}
        rulesType="dashed"
        adjustToWidth
        isAnimated
        pointerConfig={{
          pointerStripHeight: 130,
          pointerLabelComponent: (items: { value: number }[]) => (
            <View className="-mt-8 items-center rounded-lg bg-foreground px-2 py-1">
              <Text className="text-xs font-semibold text-background">
                {formatValue(items[0]?.value ?? 0)}
              </Text>
            </View>
          ),
        }}
      />
      <Caption className="mt-2 self-start text-primary">Peak: {formatValue(peak)}</Caption>
    </View>
  );
});
