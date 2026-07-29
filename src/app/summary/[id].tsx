import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Clock, Layers, Dumbbell, Trophy } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SummaryStat } from '@/components/workout/summary-stat';
import { getWorkoutLog, type SessionWorkout } from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { formatClock, formatDuration, formatFullDate, formatVolume, formatWeight, setVolume } from '@/db/calc';
import type { SetEntry } from '@/db/types';

interface Breakdown {
  exerciseId: number;
  exerciseName: string;
  completedSets: number;
  totalSets: number;
  volume: number;
  best: SetEntry;
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const router = useRouter();
  const { unit } = useSettings();
  const [log, setLog] = useState<SessionWorkout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkoutLog(logId).then((s) => {
      setLog(s);
      setLoading(false);
    });
  }, [logId]);

  useEffect(() => {
    if (log && !log.isComplete) router.replace(`/session/${log.id}`);
  }, [log, router]);

  const breakdown = useMemo<Breakdown[]>(() => {
    const map = new Map<number, Breakdown>();
    for (const s of log?.sets ?? []) {
      let b = map.get(s.exerciseId);
      if (!b) {
        b = {
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          completedSets: 0,
          totalSets: 0,
          volume: 0,
          best: s,
        };
        map.set(s.exerciseId, b);
      }
      b.totalSets++;
      if (s.completed) {
        b.completedSets++;
        b.volume += setVolume(s.weight, s.reps);
        if (setVolume(s.weight, s.reps) > setVolume(b.best.weight, b.best.reps)) b.best = s;
      }
    }
    return [...map.values()];
  }, [log]);

  if (loading)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <ActivityIndicator color="#25ca62" />
      </SafeAreaView>
    );
  if (!log) return null;

  const completedSets = log.sets.filter((s) => s.completed).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="items-center pt-6">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-success">
            <Icon icon={Check} size={32} color="success-foreground" />
          </View>
          <Heading className="mt-4">Workout complete</Heading>
          <Caption className="mt-1">{formatFullDate(log.startedAt)}</Caption>
        </View>

        <View className="mt-6 flex-row gap-3">
          <SummaryStat label="Duration" value={formatDuration(log.durationSeconds)} icon={<Icon icon={Clock} size={20} color="primary" />} />
          <SummaryStat label="Volume" value={formatVolume(log.totalVolume, unit)} icon={<Icon icon={Layers} size={20} color="info" />} />
          <SummaryStat label="Sets" value={`${completedSets}`} icon={<Icon icon={Dumbbell} size={20} color="warning" />} />
        </View>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Exercise breakdown</CardTitle>
            <CardDescription>Your top set per exercise</CardDescription>
          </CardHeader>
          <View className="gap-3">
            {breakdown.map((b) => (
              <View key={b.exerciseId} className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Body className="font-medium text-foreground">{b.exerciseName}</Body>
                  <Caption>
                    {b.completedSets}/{b.totalSets} sets · {formatVolume(b.volume, unit)}
                  </Caption>
                </View>
                <Badge variant="default">
                  {formatWeight(b.best.weight, unit)} × {b.best.reps}
                </Badge>
              </View>
            ))}
          </View>
        </Card>

        <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-primary/10 p-4">
          <Icon icon={Trophy} size={20} color="primary" />
          <Body className="flex-1 text-sm text-foreground">Keep showing up — consistency builds strength.</Body>
        </View>

        <Button size="lg" className="mt-6" onPress={() => router.replace('/(app)/(tabs)')}>
          Done
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}