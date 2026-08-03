import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Moon } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { getWorkoutDays, getWorkoutsForDay, getStreak } from '@/db/queries';
import { formatDuration, formatVolume } from '@/db/calc';
import { useSettings } from '@/store/settings-store';
import { cn } from '@/lib/cn';
import type { Unit, WorkoutLog } from '@/db/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
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
function DaySummary({ workouts, unit, onPressWorkout }: { workouts: WorkoutLog[]; unit: Unit; onPressWorkout: (id: number) => void }) {
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
        <Pressable key={w.id} onPress={() => onPressWorkout(w.id)} android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <Body className="text-base font-semibold text-foreground">{w.name}</Body>
              <Caption>{formatDuration(w.durationSeconds)}</Caption>
            </View>
            <View className="mt-2 flex-row gap-4">
              <Caption>{formatVolume(w.totalVolume, unit)}</Caption>
              <Caption>{new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Caption>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const { unit } = useSettings();
  const [now] = useState(() => Date.now());

  const [workoutDaySet, setWorkoutDaySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [restDays, setRestDays] = useState(0);

  // Day summary sheet
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workouts: WorkoutLog[] } | null>(null);

  // Infinite list of months: from the earliest workout month (or 24 months back)
  // through the current month. Tracks scroll position to update the header title.
  const [months, setMonths] = useState<{ year: number; month: number }[]>([]);
  const monthOffsets = useRef<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [visibleIndex, setVisibleIndex] = useState(-1);

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

      // Build month list from a fixed far-back point (5 years) → current month,
      // so there's always history to scroll back through.
      const fiveYearsBack = now - 5 * 365 * 86400000;
      const startDate = days.length > 0 ? new Date(Math.min(days[0], fiveYearsBack)) : new Date(fiveYearsBack);
      const list: { year: number; month: number }[] = [];
      let y = startDate.getFullYear();
      let m = startDate.getMonth();
      while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
        list.push({ year: y, month: m });
        m++;
        if (m > 11) { m = 0; y++; }
      }
      setMonths(list);
      setVisibleIndex(list.length - 1);
    } finally {
      setLoading(false);
    }
  }, [now, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDayPress = useCallback(async (dayMs: number) => {
    const workouts = await getWorkoutsForDay(dayMs);
    setSelectedDay({ date: new Date(dayMs), workouts });
  }, []);

  const openWorkout = useCallback((id: number) => {
    setSelectedDay(null);
    router.push(`/summary/${id}`);
  }, [router]);

  const goToToday = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleMonthLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    monthOffsets.current[index] = event.nativeEvent.layout.y;
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const offsets = monthOffsets.current;
    let idx = 0;
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i] !== undefined && offsets[i] <= y) idx = i;
    }
    if (idx !== visibleIndex) setVisibleIndex(idx);
  }, [visibleIndex]);

  // Scroll to the current month (end of the list) once the content has laid out.
  // Using onContentSizeChange guarantees offsets/height are ready, unlike a fixed
  // timeout that races onLayout.
  const didInitScroll = useRef(false);
  const handleContentSizeChange = useCallback(() => {
    if (!didInitScroll.current && months.length > 0) {
      didInitScroll.current = true;
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, [months.length]);

  const visible = months[visibleIndex] ?? months[months.length - 1] ?? { year: today.getFullYear(), month: today.getMonth() };
  const visibleLabel = `${MONTH_NAMES[visible.month]} ${visible.year}`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <View style={{ width: 24 }} />
        <Pressable onPress={goToToday} className="flex-row items-center gap-1">
          <Body className="text-lg font-semibold text-foreground">{visibleLabel}</Body>
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

      {/* Day-of-week header pinned */}
      <View className="mx-4 mt-3 flex-row border-b border-border pb-2">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Caption className="text-xs">{label}</Caption>
          </View>
        ))}
      </View>

      {/* Calendar scroll */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {loading ? (
          <View className="items-center py-10">
            <Caption>Loading calendar...</Caption>
          </View>
        ) : (
          months.map(({ year, month }, index) => (
            <View key={`${year}-${month}`} onLayout={(e) => handleMonthLayout(index, e)}>
              <MonthGrid
                year={year}
                month={month}
                workoutDays={workoutDaySet}
                onDayPress={handleDayPress}
                today={today}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* Day workout summary sheet */}
      <Sheet
        open={selectedDay !== null}
        onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
        title={selectedDay ? selectedDay.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        snapPoints={['40%', '60%']}>
        <DaySummary workouts={selectedDay?.workouts ?? []} unit={unit} onPressWorkout={openWorkout} />
      </Sheet>
    </SafeAreaView>
  );
}
