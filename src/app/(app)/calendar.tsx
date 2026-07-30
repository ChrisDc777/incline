import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { getWorkoutDays } from '@/db/queries';

const CELL_SIZE = 14;
const GAP = 3;
const DAYS_OF_WEEK = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns an array of weeks, where each week is an array of 7 Date objects. */
function getWeeksInRange(start: Date, end: Date): Date[][] {
  const weeks: Date[][] = [];
  const current = new Date(start);
  // Align to Monday
  current.setDate(current.getDate() - ((current.getDay() + 6) % 7));

  while (current <= end) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
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
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364); // ~52 weeks
    return getWeeksInRange(start, end);
  }, []);

  const totalWorkouts = workoutDays.size;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Heading>Workout Calendar</Heading>
        <Caption className="mt-1">{totalWorkouts} workout days in the last year</Caption>

        <Card className="mt-5 p-4">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>

          {loading ? (
            <View className="items-center py-8">
              <Caption>Loading...</Caption>
            </View>
          ) : (
            <>
              <View className="flex-row gap-1">
                <View style={{ width: 28 }} />
                {weeks.map((week, wi) => (
                  <View key={wi} style={{ width: CELL_SIZE, gap: GAP }}>
                    {wi % 4 === 0 && (
                      <Caption style={{ fontSize: 9, height: 14 }}>
                        {week[0].toLocaleDateString(undefined, { month: 'short' })}
                      </Caption>
                    )}
                  </View>
                ))}
              </View>

              {DAYS_OF_WEEK.map((day, di) => (
                <View key={di} className="flex-row items-center" style={{ gap: GAP }}>
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
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderRadius: 3,
                          backgroundColor: hasWorkout ? '#25ca62' : '#1c1c1e',
                          opacity: isFuture ? 0 : 1,
                        }}
                      />
                    );
                  })}
                </View>
              ))}

              <View className="mt-3 flex-row items-center gap-2 self-end">
                <Caption>Less</Caption>
                {[0, 0.3, 0.6, 1].map((op, i) => (
                  <View
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: '#25ca62',
                      opacity: op,
                    }}
                  />
                ))}
                <Caption>More</Caption>
              </View>
            </>
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
