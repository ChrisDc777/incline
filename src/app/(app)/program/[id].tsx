import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { openDatabase } from '@/db/client';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import type { Program, ProgramWorkout } from '@/db/types';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const programId = Number(id);
  const navigation = useNavigation();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: true, title: 'Program' });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        const database = await openDatabase();
        const row = await database.getFirstAsync<Program>(
          'SELECT * FROM programs WHERE id = ?',
          programId,
        );
        if (row) {
          const workouts = await database.getAllAsync<ProgramWorkout>(
            'SELECT * FROM program_workouts WHERE program_id = ? ORDER BY week, day, sort_order',
            programId,
          );
          setProgram({ ...row, workouts });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  if (loading) return <ListSkeleton count={3} />;
  if (error || !program) return <ErrorState title="Program not found" />;

  const workouts = program.workouts ?? [];
  const weeks = program.weeks ?? 1;

  const grouped: Record<number, ProgramWorkout[]> = {};
  for (const w of workouts) {
    const key = w.week ?? 1;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Heading>{program.name}</Heading>
        <Body className="mt-2 text-muted-foreground">{program.description}</Body>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <Badge variant="outline">{weeks} weeks</Badge>
          <Badge variant="outline">{workouts.length} sessions</Badge>
        </View>

        <View className="mt-6 gap-4">
          {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
            <View key={week}>
              <Caption className="mb-2 font-semibold uppercase tracking-wide">Week {week}</Caption>
              <View className="gap-2">
                {(grouped[week] ?? []).map((pw) => (
                  <Card key={pw.id}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Body className="font-medium text-foreground">
                          Day {pw.day} — {pw.template?.name ?? 'Workout'}
                        </Body>
                        {pw.template ? (
                          <Caption className="mt-0.5">
                            {pw.template.estimatedMinutes} min · {DIFFICULTY_LABELS[pw.template.difficulty]}
                          </Caption>
                        ) : null}
                      </View>
                      {pw.templateId ? (
                        <Pressable
                          onPress={() => router.push(`/workout/${pw.templateId}`)}
                          className="rounded-lg bg-primary/10 px-3 py-1.5">
                          <Body className="text-xs font-medium text-primary">View</Body>
                        </Pressable>
                      ) : null}
                    </View>
                  </Card>
                ))}
                {(grouped[week] ?? []).length === 0 && (
                  <Card>
                    <Caption>No workouts scheduled</Caption>
                  </Card>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
