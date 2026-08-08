import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Medal, PencilLine, Share2 } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { SummaryStat } from '@/components/workout/summary-stat';
import { ExerciseThumb } from '@/components/exercise/exercise-media';
import {
  getWorkoutLog,
  getWorkoutMuscleSplit,
  getWorkoutPrCount,
  type SessionWorkout,
  type SessionSet,
  type MuscleSplit,
} from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import { formatDuration, formatVolume, formatWeight, formatFullDateTime } from '@/db/calc';
import { MUSCLE_LABELS, muscleColor } from '@/lib/labels';
import { useChartPalette } from '@/lib/use-chart-palette';
import { METRIC_ICONS } from '@/lib/metric-icons';

function MuscleSplitBar({ split }: { split: MuscleSplit }) {
  const palette = useChartPalette();
  const color = muscleColor(split.muscle, palette);
  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Body className="text-sm text-foreground">{MUSCLE_LABELS[split.muscle]}</Body>
        <Caption>{split.percentage}%</Caption>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-muted/40">
        <View className="h-full rounded-full" style={{ width: `${split.percentage}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const router = useRouter();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const [log, setLog] = useState<SessionWorkout | null>(null);
  const [muscleSplit, setMuscleSplit] = useState<MuscleSplit[]>([]);
  const [prCount, setPrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [s, split, prs] = await Promise.all([
      getWorkoutLog(logId),
      getWorkoutMuscleSplit(logId),
      getWorkoutPrCount(logId),
    ]);
    setLog(s);
    setMuscleSplit(split);
    setPrCount(prs);
    setLoading(false);
  }, [logId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    if (log && !log.isComplete) router.replace(`/session/${log.id}`);
  }, [log, router]);

  const breakdown = useMemo(() => {
    const map = new Map<number, { exerciseId: number; exerciseName: string; imageUrl: string | null; sets: SessionSet[] }>();
    for (const s of log?.sets ?? []) {
      if (!s.completed) continue;
      let b = map.get(s.exerciseId);
      if (!b) {
        b = { exerciseId: s.exerciseId, exerciseName: s.exerciseName, imageUrl: null, sets: [] };
        map.set(s.exerciseId, b);
      }
      b.sets.push(s);
    }
    return [...map.values()];
  }, [log]);

  const athleteName = profile?.name?.trim() || 'Athlete';
  const volumeLabel = log ? formatVolume(log.totalVolume, unit) : '';
  const completedSets = log?.sets.filter((s) => s.completed).length ?? 0;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <PrimaryActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Body className="text-center font-semibold text-foreground">Workout not found</Body>
        <Caption className="mt-2 text-center">This session may have been deleted.</Caption>
        <Button className="mt-4" onPress={() => router.replace('/(app)/(tabs)')}>Go home</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Pressable onPress={() => router.back()} className="p-1" accessibilityRole="button" accessibilityLabel="Go back">
          <Icon icon={ArrowLeft} size={24} color="foreground" />
        </Pressable>
        <Body className="text-base font-semibold text-foreground">Workout Detail</Body>
        <Pressable
          onPress={() => router.push(`/share/${logId}` as Href)}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="Share workout">
          <Icon icon={Share2} size={22} color="foreground" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-3 flex-row items-center gap-3">
          <InitialsAvatar name={athleteName} uri={profile?.avatarUrl} size={44} />
          <View className="flex-1">
            <Body className="font-semibold text-foreground">{athleteName}</Body>
            <Caption>{formatFullDateTime(log.startedAt)}</Caption>
          </View>
        </View>

        <Body className="mb-3 text-xl font-bold text-foreground">{log.name}</Body>

        <View className="mb-4 flex-row gap-3">
          <SummaryStat label="Time" value={formatDuration(log.durationSeconds)} icon={<Icon icon={Clock} size={18} color="primary" />} />
          <SummaryStat label="Volume" value={volumeLabel} icon={<Icon icon={METRIC_ICONS.volume} size={18} color="info" />} />
          <SummaryStat label="Sets" value={`${completedSets}`} icon={<Icon icon={METRIC_ICONS.sets} size={18} color="warning" />} />
          {prCount > 0 ? (
            <SummaryStat label="Records" value={`${prCount}`} icon={<Icon icon={Medal} size={18} color="warning" />} />
          ) : null}
        </View>

        <Button
          variant="outline"
          className="mb-5"
          leftIcon={<Icon icon={Share2} size={16} color="primary" />}
          onPress={() => router.push(`/share/${logId}` as Href)}>
          Share
        </Button>

        {muscleSplit.length > 0 ? (
          <View className="mb-5">
            <Caption className="mb-3 text-base font-semibold text-foreground">Muscle Split</Caption>
            {muscleSplit.map((s) => (
              <MuscleSplitBar key={s.muscle} split={s} />
            ))}
          </View>
        ) : null}

        <View className="mb-3 flex-row items-center justify-between">
          <Caption className="text-base font-semibold text-foreground">Workout</Caption>
          <Pressable
            onPress={() => router.push({ pathname: '/edit-workout/[id]', params: { id: String(logId) } } as Href)}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
            className="flex-row items-center gap-1">
            <Icon icon={PencilLine} size={14} color="primary" />
            <Caption className="font-medium text-primary">Edit Workout</Caption>
          </Pressable>
        </View>

        <View className="gap-5">
          {breakdown.length === 0 ? (
            <Caption>No completed sets in this session.</Caption>
          ) : (
            breakdown.map((b) => (
              <View key={b.exerciseId}>
                <Pressable
                  onPress={() => router.push(`/exercise/${b.exerciseId}`)}
                  style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
                  className="mb-2 flex-row items-center gap-3"
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${b.exerciseName} details`}>
                  <ExerciseThumb uri={b.imageUrl} />
                  <Body className="flex-1 text-base font-semibold text-primary">{b.exerciseName}</Body>
                </Pressable>
                <View className="mb-1 flex-row items-center gap-3 px-2">
                  <Caption className="w-10">SET</Caption>
                  <Caption className="flex-1">WEIGHT & REPS</Caption>
                </View>
                {b.sets.map((s) => (
                  <View key={s.id} className="flex-row items-center gap-3 px-2 py-1.5">
                    <Caption className="w-10 font-medium">{s.setIndex + 1}</Caption>
                    <Body className="flex-1 text-sm">
                      {s.weight > 0 ? `${formatWeight(s.weight, unit)} × ${s.reps}` : `${s.reps} reps`}
                    </Body>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
