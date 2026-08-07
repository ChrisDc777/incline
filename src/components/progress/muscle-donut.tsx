import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PieChart, type pieDataItem } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useChartPalette } from '@/lib/use-chart-palette';
import { MUSCLE_LABELS, muscleColor } from '@/lib/labels';
import { useThemeHex } from '@/lib/theme';
import type { MuscleDistribution, Unit } from '@/db/types';

/** Hevy-style muscle focus donut with selectable slices + legend. */
export const MuscleDonut = memo(function MuscleDonut({
  data,
  unit,
  className,
}: {
  data: MuscleDistribution[];
  unit: Unit;
  className?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const palette = useChartPalette();
  const colors = useThemeHex();
  if (data.length === 0) {
    return <Text className="text-sm text-muted-foreground">No training data yet.</Text>;
  }
  const totalSets = data.reduce((acc, d) => acc + d.sets, 0);
  const top = data.slice(0, 6);
  const slices = top.map((d) => ({
    value: d.sets,
    color: muscleColor(d.muscle, palette),
    text: `${Math.round((d.sets / totalSets) * 100)}%`,
  }));
  const active = top.find((d) => d.muscle === selected) ?? null;

  return (
    <View className={cn('items-center gap-4', className)}>
      <PieChart
        data={slices}
        donut
        radius={72}
        innerRadius={50}
        innerCircleColor="transparent"
        centerLabelComponent={() => (
          <View className="items-center">
            <Text className="text-xl font-bold text-foreground">{active ? `${Math.round((active.sets / totalSets) * 100)}%` : totalSets}</Text>
            <Text className="text-xs text-muted-foreground">{active ? MUSCLE_LABELS[active.muscle] : 'sets'}</Text>
          </View>
        )}
        textColor={colors.foreground}
        textSize={10}
        showText
        onPress={(_item: pieDataItem, index: number) => setSelected(top[index]?.muscle ?? null)}
      />
      <View className="w-full gap-1.5">
        {top.map((d) => (
          <Pressable key={d.muscle} onPress={() => setSelected(selected === d.muscle ? null : d.muscle)} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: muscleColor(d.muscle, palette) }} />
              <Text className={cn('text-sm', d.muscle === selected ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{MUSCLE_LABELS[d.muscle]}</Text>
            </View>
            <Text className="text-xs text-muted-foreground">{d.sets} sets</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});
