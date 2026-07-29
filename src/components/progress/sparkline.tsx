import { View } from 'react-native';
import Svg, { Polyline, Polygon } from 'react-native-svg';

import { Text } from '@/components/ui/text';

/** Minimal sparkline (SVG) for small trends like bodyweight or volume. */
export function Sparkline({
  points,
  width = 120,
  height = 40,
  color = '#25ca62',
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) {
    return (
      <View style={{ width, height }} className="items-center justify-center">
        <Text className="text-xs text-muted-foreground">—</Text>
      </View>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(' ');
  const area = `${0},${height} ${line} ${width},${height}`;
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polygon points={area} fill={color} opacity={0.12} />
        <Polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
