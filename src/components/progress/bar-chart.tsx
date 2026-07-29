import { View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui/text';

/**
 * Simple, dependency-free vertical bar chart (SVG). Bars scale to the max
 * value; labels render under each bar.
 */
export function BarChart({
  data,
  height = 160,
  color = '#25ca62',
  formatValue,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const width = 320;
  const padTop = 16;
  const padBottom = 22;
  const chartH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = data.length > 0 ? width / data.length : width;
  const barW = Math.min(26, slot * 0.6);

  if (data.length === 0) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text className="text-sm text-muted-foreground">No data yet</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * chartH;
          const x = i * slot + slot / 2 - barW / 2;
          const y = padTop + (chartH - h);
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={5} fill={color} opacity={d.value > 0 ? 1 : 0.25} />
              <SvgText x={i * slot + slot / 2} y={height - 6} fontSize={9} fill="#9ca3af" textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {formatValue && max > 0 ? (
        <Text className="absolute right-0 top-0 text-xs text-muted-foreground">{formatValue(max)}</Text>
      ) : null}
    </View>
  );
}
