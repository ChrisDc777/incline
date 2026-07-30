import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { getWorkoutDays } from '@/db/queries';

const CELL = 16;
const GAP = 4;
const WEEKS_TO_SHOW = 16;
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeeks(end: Date, count: number): Date[][] {
  const weeks: Date[][] = [];
  const cur = new Date(end);
  cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); // align to Monday

  // Go back to start of the range
  cur.setDate(cur.getDate() - (count - 1) * 7);

  for (let w = 0; w < count; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function CalendarScreen() {
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkoutDays().then((days) => {
      setWorkoutDays(new Set(days.map((d) => toDateKey(new Date(d)))));
      setLoading(false);
    });
  }, []);

  const weeks = useMemo(() => {
    return getWeeks(new Date(), WEEKS_TO_SHOW);
  }, []);

  const totalWorkouts = workoutDays.size;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Heading>Workout Calendar</Heading>
        <Caption className="mt-1">{totalWorkouts} total workout days</Caption>

        <Card className="mt-5 p-4">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>

          {loading ? (
            <View className="items-center py-8">
              <Caption>Loading...</Caption>
            </View>
          ) : (
            <View style={{ overflow: 'hidden' }}>
              {/* Month labels row */}
              <View className="flex-row" style={{ gap: GAP }}>
                <View style={{ width: 28 }} />
                {weeks.map((week, wi) => {
                  const first = week[0];
                  const showLabel = wi === 0 || first.getDate() <= 7;
                  return (
                    <View key={wi} style={{ width: CELL, alignItems: 'center' }}>
                      {showLabel && (
                        <Caption style={{ fontSize: 9, marginBottom: 2 }}>
                          {first.toLocaleDateString(undefined, { month: 'short' })}
                        </Caption>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Day grid */}
              {DAYS.map((day, di) => (
                <View key={di} className="flex-row items-center" style={{ gap: GAP, marginTop: di === 0 ? 4 : GAP }}>
                  <View style={{ width: 28 }}>
                    <Caption style={{ fontSize: 9 }}>{day}</Caption>
                  </View>
                  {weeks.map((week, wi) => {
                    const date = week[di];
                    const key = toDateKey(date);
                    const isFuture = date > new Date();
                    const hasWorkout = workoutDays.has(key);
                    return (
                      <View
                        key={`${wi}-${di}`}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 3,
                          backgroundColor: hasWorkout ? '#16a34a' : '#262626',
                          opacity: isFuture ? 0 : 1,
                        }}
                      />
                    );
                  })}
                </View>
              ))}

              {/* Legend */}
              <View className="mt-4 flex-row items-center gap-2 self-end">
                <Caption>Less</Caption>
                {[0.25, 0.5, 0.75, 1].map((op, i) => (
                  <View
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: '#16a34a',
                      opacity: op,
                    }}
                  />
                ))}
                <Caption>More</Caption>
              </View>
            </View>
          )}
        </Card>

        <Card className="mt-5 p-4">
          <Body className="text-sm text-foreground">
            Complete workouts appear as green squares. The more you train, the brighter the squares.
          </Body>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
