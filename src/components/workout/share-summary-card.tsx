import { forwardRef } from 'react';
import { View } from 'react-native';

import { Body, Caption } from '@/components/common/text';
import { formatDuration, formatVolume } from '@/db/calc';

/**
 * Compact branded card captured for sharing. Keep typography calm —
 * brand name + workout name + three metrics only.
 */
export const ShareSummaryCard = forwardRef<
  View,
  {
    athleteName: string;
    workoutName: string;
    durationSeconds: number;
    volumeLabel: string;
    completedSets: number;
    prCount: number;
  }
>(function ShareSummaryCard(
  { athleteName, workoutName, durationSeconds, volumeLabel, completedSets, prCount },
  ref,
) {
  return (
    <View
      ref={ref}
      collapsable={false}
      className="w-full overflow-hidden rounded-3xl border border-border bg-card p-5"
      style={{ backgroundColor: '#151519' }}>
      <Caption className="tracking-wide text-zinc-400">INCLINE</Caption>
      <Body className="mt-2 text-xl font-bold text-zinc-50">{workoutName}</Body>
      <Caption className="mt-1 text-zinc-400">{athleteName}</Caption>
      <View className="mt-5 flex-row justify-between gap-3">
        <View className="flex-1">
          <Caption className="text-zinc-500">Time</Caption>
          <Body className="mt-0.5 font-semibold text-zinc-50">{formatDuration(durationSeconds)}</Body>
        </View>
        <View className="flex-1">
          <Caption className="text-zinc-500">Volume</Caption>
          <Body className="mt-0.5 font-semibold text-zinc-50">{volumeLabel}</Body>
        </View>
        <View className="flex-1">
          <Caption className="text-zinc-500">Sets</Caption>
          <Body className="mt-0.5 font-semibold text-zinc-50">{completedSets}</Body>
        </View>
        {prCount > 0 ? (
          <View className="flex-1">
            <Caption className="text-zinc-500">PRs</Caption>
            <Body className="mt-0.5 font-semibold text-zinc-50">{prCount}</Body>
          </View>
        ) : null}
      </View>
      <Caption className="mt-5 text-center text-zinc-500">Train with me on Incline</Caption>
    </View>
  );
});
