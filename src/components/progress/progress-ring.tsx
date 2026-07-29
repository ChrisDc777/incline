import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';

/**
 * Reusable circular progress ring (SVG). Used for the rest timer, the streak
 * ring, and any circular gauge. `children` render centered.
 */
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#25ca62',
  trackColor = 'rgba(120,120,120,0.25)',
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} className="absolute">
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="items-center justify-center">{children}</View>
    </View>
  );
}

/** Convenience label inside a ring. */
export function RingLabel({ value, label }: { value: string; label?: string }) {
  return (
    <View className="items-center">
      <Text className="text-2xl font-bold tracking-tight text-foreground">{value}</Text>
      {label ? <Text className="text-xs text-muted-foreground">{label}</Text> : null}
    </View>
  );
}
