import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, LayoutChangeEvent, Pressable, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Moon } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { getWorkoutDays, getStreak } from '@/db/queries';
import { cn } from '@/lib/cn';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Every month grid reserves a fixed slot so FlatList can compute exact item
// offsets (getItemLayout). Height = title (36) + up to 6 day rows (60 each) + margin (24).
const MONTH_HEIGHT = 420;
const DAY_CELL_HEIGHT = 60;
const BOTTOM_PADDING = 40;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };

interface MonthItem {
  year: number;
  month: number;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** A single month grid in the calendar. Memoized so scrolling doesn't re-render
 * every visible month — the flat list only re-renders cells whose props change. */
const MonthGrid = memo(function MonthGrid({
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
                  return <View key={`blank-${colIdx}`} style={{ height: DAY_CELL_HEIGHT }} className="flex-1 items-center" />;
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
                    style={{ height: DAY_CELL_HEIGHT }}
                    className="flex-1 items-center justify-center"
                    android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
                    <View
                      style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden' }}
                      className={cn(
                        'items-center justify-center',
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
                      <View className="mt-0.5 bg-primary" style={{ width: 6, height: 6, borderRadius: 3 }} />
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
});

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [now] = useState(() => Date.now());

  const [workoutDaySet, setWorkoutDaySet] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [restDays, setRestDays] = useState(0);
  const [loading, setLoading] = useState(true);

  // Months are built synchronously (5 years back → current) so the calendar is
  // instantly interactive; workout dots + stats fill in once the DB query lands.
  const [months] = useState<MonthItem[]>(() => {
    const list: MonthItem[] = [];
    const start = new Date(now - 5 * 365 * 86400000);
    let y = start.getFullYear();
    let m = start.getMonth();
    while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
      list.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return list;
  });

  const listRef = useRef<FlatList<MonthItem>>(null);
  const viewportHeightRef = useRef(0);
  const didInitScrollRef = useRef(false);
  const [visibleIndex, setVisibleIndex] = useState(months.length - 1);

  useEffect(() => {
    (async () => {
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
      } catch {
        // Leave the calendar usable even if stats fail to load.
      } finally {
        setLoading(false);
      }
    })();
  }, [now]);

  const handleDayPress = useCallback((dayMs: number) => {
    router.push({ pathname: '/(app)/day/[ms]', params: { ms: String(dayMs) } });
  }, [router]);

  // Pin the current month (end of the list) to the bottom of the viewport.
  const scrollToBottom = useCallback((animated: boolean) => {
    if (months.length === 0 || viewportHeightRef.current === 0) return;
    const total = months.length * MONTH_HEIGHT + BOTTOM_PADDING;
    const target = Math.max(0, total - viewportHeightRef.current);
    listRef.current?.scrollToOffset({ offset: target, animated });
  }, [months.length]);

  const tryInitScroll = useCallback(() => {
    if (didInitScrollRef.current) return;
    if (months.length === 0 || viewportHeightRef.current === 0) return;
    didInitScrollRef.current = true;
    scrollToBottom(false);
  }, [months.length, scrollToBottom]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
    tryInitScroll();
  }, [tryInitScroll]);

  useEffect(() => { tryInitScroll(); }, [tryInitScroll]);

  const goToToday = useCallback(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  const getItemLayout = useCallback((_: ArrayLike<MonthItem> | null | undefined, index: number) => ({
    length: MONTH_HEIGHT,
    offset: MONTH_HEIGHT * index,
    index,
  }), []);

  const renderMonth = useCallback(({ item }: { item: MonthItem }) => (
    <View style={{ height: MONTH_HEIGHT }}>
      <MonthGrid
        year={item.year}
        month={item.month}
        workoutDays={workoutDaySet}
        onDayPress={handleDayPress}
        today={today}
      />
    </View>
  ), [workoutDaySet, handleDayPress, today]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (first.index != null) setVisibleIndex(first.index);
  }, []);

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
        <View className="w-6 items-center">
          {loading ? <ActivityIndicator size="small" color="#16a34a" /> : null}
        </View>
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

      {/* Calendar scroll (virtualized, starts at the current month) */}
      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={(m) => `${m.year}-${m.month}`}
        renderItem={renderMonth}
        getItemLayout={getItemLayout}
        initialScrollIndex={months.length - 1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onLayout={handleLayout}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: BOTTOM_PADDING }}
      />
    </SafeAreaView>
  );
}
