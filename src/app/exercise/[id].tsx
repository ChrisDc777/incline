import { useMemo, useLayoutEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Dumbbell, Target, ListChecks, Lightbulb, History } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { MuscleBadge } from '@/components/exercise/muscle-badge';
import { useExercise, useExerciseHistory } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { MUSCLE_LABELS, EQUIPMENT_LABELS, MOVEMENT_LABELS, CATEGORY_LABELS } from '@/lib/labels';
import { formatWeight, relativeTime } from '@/db/calc';
import type { ExerciseHistoryRow } from '@/db/types';

interface SessionGroup {
  workoutLogId: number;
  workoutName: string;
  startedAt: number;
  sets: ExerciseHistoryRow[];
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const { unit } = useSettings();
  const { data: exercise, loading, error, refetch } = useExercise(exerciseId);
  const { data: history } = useExerciseHistory(exerciseId);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, title: 'Exercise' });
  }, [navigation]);

  const sessions = useMemo<SessionGroup[]>(() => {
    const groups: SessionGroup[] = [];
    for (const row of history ?? []) {
      let g = groups.find((x) => x.workoutLogId === row.workoutLogId);
      if (!g) {
        g = { workoutLogId: row.workoutLogId, workoutName: row.workoutName, startedAt: row.startedAt, sets: [] };
        groups.push(g);
      }
      g.sets.push(row);
    }
    return groups;
  }, [history]);

  if (loading) return <ListSkeleton count={2} />;
  if (error || !exercise)
    return <ErrorState onRetry={refetch} title="Exercise not found" description="It may have been removed." />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <Icon icon={Dumbbell} size={22} color="primary" />
        </View>
        <View className="flex-1">
          <Heading>{exercise.name}</Heading>
          <Caption>
            {EQUIPMENT_LABELS[exercise.equipment]} · {CATEGORY_LABELS[exercise.category]}
          </Caption>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Badge variant="outline">{MOVEMENT_LABELS[exercise.movementPattern]}</Badge>
        {exercise.isCompound ? <Badge variant="default">Compound</Badge> : <Badge variant="secondary">Isolation</Badge>}
      </View>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Muscles worked</CardTitle>
          <Icon icon={Target} size={18} color="muted-foreground" />
        </CardHeader>
        <View className="flex-row flex-wrap gap-2">
          <MuscleBadge muscle={exercise.primaryMuscle} />
          {exercise.secondaryMuscles.map((m) => (
            <Badge key={m} variant="secondary">
              {MUSCLE_LABELS[m]}
            </Badge>
          ))}
        </View>
      </Card>

      {exercise.instructions.length > 0 ? (
        <Card className="mt-3">
          <CardHeader>
            <CardTitle>How to perform</CardTitle>
            <Icon icon={ListChecks} size={18} color="muted-foreground" />
          </CardHeader>
          <View className="gap-2.5">
            {exercise.instructions.map((step, i) => (
              <View key={i} className="flex-row gap-3">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                  <Caption className="text-primary">{i + 1}</Caption>
                </View>
                <Body className="flex-1 text-sm text-foreground">{step}</Body>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {exercise.tips ? (
        <Card className="mt-3 flex-row gap-3">
          <Icon icon={Lightbulb} size={20} color="warning" />
          <Body className="flex-1 text-sm text-foreground">{exercise.tips}</Body>
        </Card>
      ) : null}

      <View className="mt-6">
        <View className="mb-3 flex-row items-center justify-between">
          <CardTitle>Recent history</CardTitle>
          <Icon icon={History} size={18} color="muted-foreground" />
        </View>
        {sessions.length > 0 ? (
          <View className="gap-2.5">
            {sessions.map((s) => (
              <Card key={s.workoutLogId} className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Body className="font-medium text-foreground">{s.workoutName}</Body>
                  <Caption>{relativeTime(s.startedAt)}</Caption>
                </View>
                <View className="flex-row flex-wrap justify-end gap-1.5">
                  {s.sets.map((set) => (
                    <Badge key={set.setIndex} variant="outline">
                      {formatWeight(set.weight, unit)} × {set.reps}
                    </Badge>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No history yet" description="Log this exercise in a workout to track your progress." />
        )}
      </View>
    </ScrollView>
  );
}
