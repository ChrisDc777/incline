import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Flame, Moon } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { getWorkoutDays, getWorkoutsForDay, getStreak } from '@/db/queries';
import { cn } from '@/lib/cn';
import type { WorkoutLog } from '@/db/types';

type ViewMode = 'month';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

/** A single month grid in the calendar. */
function MonthGrid({
  year,
  month,
  workoutDays,
  onDayPress,
  today,
}: {
  year: number;
  month: number;
  workoutDays: Set<string>;
  onDayPress: (dayMs: number) => void;
  today: Date;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];

  // Leading blanks
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // Day numbers
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <View className="mb-6">
      <Body className="mb-3 px-1 text-base font-semibold text-foreground">
        {MONTH_NAMES[month]} {year}
      </Body>

      {/* Day-of-week header */}
      <View className="flex-row border-b border-border pb-2">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Caption className="text-xs">{label}</Caption>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="mt-1">
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => {
          const row = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
          return (
            <View key={rowIdx} className="flex-row">
              {row.map((day, colIdx) => {
                if (day === null) {
                  return <View key={`blank-${colIdx}`} className="flex-1 items-center py-2.5" />;
                }

                const date = new Date(year, month, day);
                const key = toDateKey(date);
                const isToday = isCurrentMonth && today.getDate() === day;
                const hasWorkout = workoutDays.has(key);
                const isFuture = date > today;

                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!isFuture) onDayPress(date.getTime());
                    }}
                    className="flex-1 items-center py-2.5"
                    android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
                    <View
                      className={cn(
                        'h-8 w-8 items-center justify-center rounded-full',
                        isToday && 'bg-blue-500',
                        hasWorkout && !isToday && 'bg-primary/20',
                      )}>
                      <Text
                        className={cn(
                          'text-sm',
                          isToday && 'font-bold text-white',
                          !isToday && isFuture && 'text-muted-foreground/40',
                          !isToday && !isFuture && hasWorkout && 'font-semibold text-primary',
                          !isToday && !isFuture && !hasWorkout && 'text-foreground',
                        )}>
                        {day}
                      </Text>
                    </View>
                    {hasWorkout && !isToday ? (
                      <View className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Workout summary shown in the bottom sheet when a day is tapped. */
function DaySummary({ workouts, unit }: { workouts: WorkoutLog[]; unit: string }) {
  if (workouts.length === 0) {
    return (
      <View className="items-center py-8">
        <Caption>No workouts on this day.</Caption>
      </View>
    );
  }

  return (
    <View className="gap-3 py-2">
      {workouts.map((w) => (
        <Card key={w.id} className="p-4">
          <View className="flex-row items-center justify-between">
            <Body className="text-base font-semibold text-foreground">{w.name}</Body>
            <Caption>{formatDuration(w.durationSeconds)}</Caption>
          </View>
          <View className="mt-2 flex-row gap-4">
            <Caption>{formatVolume(w.totalVolume)} {unit}</Caption>
            <Caption>{new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Caption>
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [now] = useState(() => Date.now());

  const [workoutDaySet, setWorkoutDaySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [restDays, setRestDays] = useState(0);

  // Month navigation state
  const [visibleMonth, setVisibleMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Day summary sheet
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workouts: WorkoutLog[] } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const days = await getWorkoutDays();
      setWorkoutDaySet(new Set(days.map((d) => toDateKey(new Date(d)))));

      const s = await getStreak();
      setStreak(s);

      // Compute rest days: total days from first workout to today minus workout days
      if (days.length > 0) {
        const firstDay = days[0];
        const totalDays = Math.floor((now - firstDay) / 86400000) + 1;
        setRestDays(totalDays - days.length);
      } else {
        setRestDays(0);
      }
    } finally {
      setLoading(false);
    }
  }, [now]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDayPress = useCallback(async (dayMs: number) => {
    const workouts = await getWorkoutsForDay(dayMs);
    setSelectedDay({ date: new Date(dayMs), workouts });
  }, []);

  const goToPrevMonth = () => {
    setVisibleMonth((prev) => {
      const m = prev.month - 1;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: m };
    });
  };

  const goToNextMonth = () => {
    setVisibleMonth((prev) => {
      const m = prev.month + 1;
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: m };
    });
  };

  const goToToday = () => {
    setVisibleMonth({ year: today.getFullYear(), month: today.getMonth() });
  };

  // Generate months to show: current month and 2 months back
  const monthsToShow = useMemo(() => {
    const months: { year: number; month: number }[] = [];
    let y = visibleMonth.year;
    let m = visibleMonth.month;
    // Go back 2 months from visible
    for (let i = 0; i < 2; i++) {
      m--;
      if (m < 0) { m = 11; y--; }
    }
    // Show 3 months (2 back + current visible)
    for (let i = 0; i < 3; i++) {
      months.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return months;
  }, [visibleMonth]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon icon={ChevronLeft} size={24} color="foreground" />
        </Pressable>
        <Pressable onPress={goToToday} className="flex-row items-center gap-1">
          <Body className="text-lg font-semibold text-foreground">
            {MONTH_NAMES[visibleMonth.month]}
          </Body>
          <Icon icon={ChevronRight} size={16} color="muted-foreground" />
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats row */}
      <View className="mx-5 mt-2 flex-row gap-3">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
          <Icon icon={Flame} size={16} color="warning" />
          <Caption className="text-sm font-medium text-foreground">{streak} week streak</Caption>
        </View>
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
          <Icon icon={Moon} size={16} color="info" />
          <Caption className="text-sm font-medium text-foreground">{restDays} rest days</Caption>
        </View>
      </View>

      {/* Month navigation */}
      <View className="mt-3 flex-row items-center justify-between px-5">
        <Button variant="ghost" size="sm" onPress={goToPrevMonth}>
          <Icon icon={ChevronLeft} size={18} color="foreground" />
        </Button>
        <Pressable onPress={goToToday}>
          <Caption className="font-medium text-primary">Today</Caption>
        </Pressable>
        <Button variant="ghost" size="sm" onPress={goToNextMonth}>
          <Icon icon={ChevronRight} size={18} color="foreground" />
        </Button>
      </View>

      {/* Calendar scroll */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {loading ? (
          <View className="items-center py-10">
            <Caption>Loading calendar...</Caption>
          </View>
        ) : (
          monthsToShow.map(({ year, month }) => (
            <MonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              workoutDays={workoutDaySet}
              onDayPress={handleDayPress}
              today={today}
            />
          ))
        )}
      </ScrollView>

      {/* Day workout summary sheet */}
      <Sheet
        open={selectedDay !== null}
        onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
        title={selectedDay ? selectedDay.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        snapPoints={['40%', '60%']}>
        <DaySummary workouts={selectedDay?.workouts ?? []} unit="kg" />
      </Sheet>
    </SafeAreaView>
  );
}
