import { View } from 'react-native';

import { Body, Caption } from '@/components/common/text';
import { MuscleBodyMap } from '@/components/progress/muscle-body-map';
import { formatWeight } from '@/db/calc';
import { useThemeHex } from '@/lib/theme';
import type { MuscleGroup, PR, TopExerciseStat, Unit } from '@/db/types';

function SlideShell({ children }: { children: React.ReactNode }) {
  const colors = useThemeHex();
  return (
    <View
      collapsable={false}
      className="w-full overflow-hidden rounded-3xl border border-border p-5"
      style={{ backgroundColor: colors.surface1, borderColor: colors.border, minHeight: 360 }}>
      {children}
    </View>
  );
}

export function MonthShareCoverSlide({
  athleteName,
  monthLabel,
  insightLine,
}: {
  athleteName: string;
  monthLabel: string;
  insightLine: string;
}) {
  const colors = useThemeHex();
  return (
    <SlideShell>
      <Caption style={{ color: colors.mutedForeground }}>INCLINE · MONTHLY</Caption>
      <Body className="mt-3 text-2xl font-bold" style={{ color: colors.foreground }}>
        Your month
      </Body>
      <Caption className="mt-1" style={{ color: colors.mutedForeground }}>
        {monthLabel}
      </Caption>
      <Caption className="mt-1" style={{ color: colors.mutedForeground }}>
        {athleteName}
      </Caption>
      <Body className="mt-8 text-base" style={{ color: colors.foreground }}>
        {insightLine}
      </Body>
      <Caption className="mt-auto pt-10 text-center" style={{ color: colors.mutedForeground }}>
        Train with me on Incline
      </Caption>
    </SlideShell>
  );
}

export function MonthShareStatsSlide({
  sessions,
  volumeLabel,
  trainedDays,
  sets,
}: {
  sessions: number;
  volumeLabel: string;
  trainedDays: number;
  sets: number;
}) {
  const colors = useThemeHex();
  return (
    <SlideShell>
      <Caption style={{ color: colors.mutedForeground }}>INCLINE · STATS</Caption>
      <Body className="mt-3 text-xl font-bold" style={{ color: colors.foreground }}>
        Month at a glance
      </Body>
      <View className="mt-6 gap-4">
        {(
          [
            ['Sessions', String(sessions)],
            ['Training days', String(trainedDays)],
            ['Volume', volumeLabel],
            ['Sets', String(sets)],
          ] as const
        ).map(([label, value]) => (
          <View key={label} className="flex-row items-center justify-between">
            <Caption style={{ color: colors.mutedForeground }}>{label}</Caption>
            <Body className="font-semibold" style={{ color: colors.foreground }}>
              {value}
            </Body>
          </View>
        ))}
      </View>
    </SlideShell>
  );
}

export function MonthSharePrsSlide({ prs, unit }: { prs: PR[]; unit: Unit }) {
  const colors = useThemeHex();
  return (
    <SlideShell>
      <Caption style={{ color: colors.mutedForeground }}>INCLINE · PRS</Caption>
      <Body className="mt-3 text-xl font-bold" style={{ color: colors.foreground }}>
        Best lifts
      </Body>
      {prs.length === 0 ? (
        <Body className="mt-8" style={{ color: colors.mutedForeground }}>
          No heavy sets logged this month.
        </Body>
      ) : (
        <View className="mt-6 gap-3">
          {prs.slice(0, 5).map((pr) => (
            <View key={pr.exerciseId} className="flex-row items-center justify-between gap-3">
              <Body className="flex-1 font-medium" style={{ color: colors.foreground }} numberOfLines={1}>
                {pr.exerciseName}
              </Body>
              <Caption style={{ color: colors.mutedForeground }}>
                {formatWeight(pr.maxWeight, unit)}
              </Caption>
            </View>
          ))}
        </View>
      )}
    </SlideShell>
  );
}

export function MonthShareMusclesSlide({ muscles }: { muscles: MuscleGroup[] }) {
  const colors = useThemeHex();
  return (
    <SlideShell>
      <Caption style={{ color: colors.mutedForeground }}>INCLINE · MUSCLES</Caption>
      <Body className="mt-3 text-xl font-bold" style={{ color: colors.foreground }}>
        What you trained
      </Body>
      {muscles.length === 0 ? (
        <Body className="mt-8" style={{ color: colors.mutedForeground }}>
          No completed sets this month.
        </Body>
      ) : (
        <View className="mt-4 items-center">
          <MuscleBodyMap muscles={muscles} compact scale={0.75} showToggle={false} />
        </View>
      )}
    </SlideShell>
  );
}

export function MonthShareTopSlide({
  exercises,
  unit,
  formatVolumeFn,
}: {
  exercises: TopExerciseStat[];
  unit: Unit;
  formatVolumeFn: (v: number, u: Unit) => string;
}) {
  const colors = useThemeHex();
  return (
    <SlideShell>
      <Caption style={{ color: colors.mutedForeground }}>INCLINE · TOP</Caption>
      <Body className="mt-3 text-xl font-bold" style={{ color: colors.foreground }}>
        Most volume
      </Body>
      <View className="mt-6 gap-3">
        {exercises.length === 0 ? (
          <Body style={{ color: colors.mutedForeground }}>Nothing logged yet.</Body>
        ) : (
          exercises.map((ex) => (
            <View key={ex.exerciseId} className="flex-row items-center justify-between gap-3">
              <Body className="flex-1 font-medium" style={{ color: colors.foreground }} numberOfLines={1}>
                {ex.exerciseName}
              </Body>
              <Caption style={{ color: colors.mutedForeground }}>
                {formatVolumeFn(ex.volume, unit)}
              </Caption>
            </View>
          ))
        )}
      </View>
    </SlideShell>
  );
}
