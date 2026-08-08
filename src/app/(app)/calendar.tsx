import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, Pressable, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Moon } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';
import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';

import { Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { Sheet } from '@/components/ui/sheet';
import { Chip } from '@/components/common/chip';
import { getWorkoutDays, getDailyVolumeByDate, getStreak } from '@/db/queries';
import { cn } from '@/lib/cn';
import { SCREEN_CONTENT, SCREEN_HEADER } from '@/lib/layout';
import { METRIC_ICONS } from '@/lib/metric-icons';
import { usePrimaryHex } from '@/lib/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_CELL_HEIGHT = 56;
const MONTH_TITLE_HEIGHT = 40;
const MONTH_MARGIN = 16;
const BOTTOM_PADDING = 40;
const SPINNER_MIN_FLOOR_MS = 200;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };

/** Background classes for volume intensity (relative to global max). */
const HEAT_BG = ['', 'bg-primary/15', 'bg-primary/30', 'bg-primary/50', 'bg-primary/70'] as const;

function heatLevel(volume: number, maxVolume: number): 0 | 1 | 2 | 3 | 4 {
  if (volume <= 0 || maxVolume <= 0) return 0;
  const t = volume / maxVolume;
  if (t <= 0.25) return 1;
  if (t <= 0.5) return 2;
  if (t <= 0.75) return 3;
  return 4;
}

interface MonthItem {
  year: number;
  month: number;
  height: number;
  offset: number;
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

function monthGridHeight(year: number, month: number): number {
  const days = getDaysInMonth(year, month);
  const first = getFirstDayOfWeek(year, month);
  const rows = Math.ceil((first + days) / 7);
  return MONTH_TITLE_HEIGHT + rows * DAY_CELL_HEIGHT + MONTH_MARGIN;
}

function buildMonths(now: number, today: Date): MonthItem[] {
  const list: MonthItem[] = [];
  const start = new Date(now - 5 * 365 * 86400000);
  let y = start.getFullYear();
  let m = start.getMonth();
  let offset = 0;
  while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
    const height = monthGridHeight(y, m);
    list.push({ year: y, month: m, height, offset });
    offset += height;
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return list;
}

const MonthGrid = memo(function MonthGrid({
  year,
  month,
  volumeByDate,
  maxVolume,
  onDayPress,
  today,
}: {
  year: number;
  month: number;
  volumeByDate: Record<string, number>;
  maxVolume: number;
  onDayPress: (dayMs: number) => void;
  today: Date;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <View className="mb-4">
      <Body className="mb-2 px-1 text-base font-semibold text-foreground">
        {MONTH_NAMES[month]} {year}
      </Body>
      <View>
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
                const volume = volumeByDate[key] ?? 0;
                const hasWorkout = volume > 0;
                const level = heatLevel(volume, maxVolume);
                const isFuture = date > today;

                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!isFuture) onDayPress(date.getTime());
                    }}
                    disabled={isFuture}
                    accessibilityRole="button"
                    accessibilityLabel={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}${hasWorkout ? ', has workout' : ''}`}
                    accessibilityState={{ disabled: isFuture, selected: isToday }}
                    style={{ height: DAY_CELL_HEIGHT }}
                    className="flex-1 items-center justify-center"
                    android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
                    <View
                      style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden' }}
                      className={cn(
                        'items-center justify-center',
                        isToday && 'bg-primary',
                        !isToday && hasWorkout && HEAT_BG[level],
                      )}>
                      <Text
                        className={cn(
                          'text-sm',
                          isToday && 'font-bold text-primary-foreground',
                          !isToday && isFuture && 'text-muted-foreground/40',
                          !isToday && !isFuture && hasWorkout && 'font-semibold text-primary',
                          !isToday && !isFuture && !hasWorkout && 'text-foreground',
                        )}>
                        {day}
                      </Text>
                    </View>
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
  const primary = usePrimaryHex();
  const today = useMemo(() => new Date(), []);
  const [now] = useState(() => Date.now());

  const [workoutDaySet, setWorkoutDaySet] = useState<Set<string>>(new Set());
  const [volumeByDate, setVolumeByDate] = useState<Record<string, number>>({});
  const [maxVolume, setMaxVolume] = useState(0);
  const [streak, setStreak] = useState(0);
  const [restDays, setRestDays] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);

  const [months] = useState<MonthItem[]>(() => buildMonths(now, today));

  const listRef = useRef<FlatList<MonthItem>>(null);
  const viewportHeightRef = useRef(0);
  const didInitScrollRef = useRef(false);
  const [visibleIndex, setVisibleIndex] = useState(months.length - 1);

  const years = useMemo(() => {
    const set = new Set(months.map((m) => m.year));
    return [...set].sort((a, b) => b - a);
  }, [months]);

  useEffect(() => {
    const floor = setTimeout(() => setMinTimePassed(true), SPINNER_MIN_FLOOR_MS);
    return () => clearTimeout(floor);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [days, volumes] = await Promise.all([getWorkoutDays(), getDailyVolumeByDate()]);
        setWorkoutDaySet(new Set(days.map((d) => toDateKey(new Date(d)))));
        setVolumeByDate(volumes);
        let max = 0;
        for (const v of Object.values(volumes)) {
          if (v > max) max = v;
        }
        setMaxVolume(max);
        const s = await getStreak();
        setStreak(s);
        if (days.length > 0) {
          const firstDay = days[0];
          const totalDays = Math.floor((now - firstDay) / 86400000) + 1;
          setRestDays(totalDays - days.length);
        } else {
          setRestDays(0);
        }
      } catch {
        // Leave the calendar usable even if stats fail to load.
      }
    })();
  }, [now]);

  const handleDayPress = useCallback((dayMs: number) => {
    router.push({ pathname: '/(app)/day/[ms]', params: { ms: String(dayMs) } });
  }, [router]);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    if (index < 0 || index >= months.length) return;
    listRef.current?.scrollToIndex({ index, animated, viewPosition: 0 });
  }, [months.length]);

  const tryInitScroll = useCallback(() => {
    if (didInitScrollRef.current) return;
    if (months.length === 0 || viewportHeightRef.current === 0) return;
    didInitScrollRef.current = true;
    requestAnimationFrame(() => scrollToIndex(months.length - 1, false));
  }, [months.length, scrollToIndex]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
    tryInitScroll();
  }, [tryInitScroll]);

  useEffect(() => {
    tryInitScroll();
  }, [tryInitScroll]);

  const goToToday = useCallback(() => {
    scrollToIndex(months.length - 1, true);
  }, [months.length, scrollToIndex]);

  const jumpToMonth = useCallback((year: number, month: number) => {
    const idx = months.findIndex((m) => m.year === year && m.month === month);
    if (idx >= 0) {
      setPickerOpen(false);
      scrollToIndex(idx, true);
    }
  }, [months, scrollToIndex]);

  const getItemLayout = useCallback((_: ArrayLike<MonthItem> | null | undefined, index: number) => {
    const item = months[index];
    return {
      length: item?.height ?? monthGridHeight(today.getFullYear(), today.getMonth()),
      offset: item?.offset ?? 0,
      index,
    };
  }, [months, today]);

  const renderMonth = useCallback(({ item }: { item: MonthItem }) => (
    <View style={{ height: item.height }}>
      <MonthGrid
        year={item.year}
        month={item.month}
        volumeByDate={volumeByDate}
        maxVolume={maxVolume}
        onDayPress={handleDayPress}
        today={today}
      />
    </View>
  ), [volumeByDate, maxVolume, handleDayPress, today]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (first.index != null) {
      setVisibleIndex(first.index);
      if (viewableItems.some((v) => v.index === months.length - 1)) {
        setCalendarReady(true);
      }
    }
  }, [months.length]);

  const visible = months[visibleIndex] ?? months[months.length - 1] ?? {
    year: today.getFullYear(),
    month: today.getMonth(),
    height: 0,
    offset: 0,
  };
  const visibleLabel = `${MONTH_NAMES[visible.month]} ${visible.year}`;
  const showSpinner = !minTimePassed || !calendarReady;

  // Activity intensity for month chips in the picker (optional hint)
  const monthActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of workoutDaySet) {
      const [y, m] = key.split('-');
      const k = `${y}-${Number(m)}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [workoutDaySet]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className={`${SCREEN_HEADER} flex-row items-center justify-between`}>
        <View style={{ width: 24 }} />
        <Pressable
          onPress={() => {
            setPickerYear(visible.year);
            setPickerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Choose month and year"
          className="flex-row items-center gap-1">
          <Body className="text-lg font-semibold text-foreground">{visibleLabel}</Body>
          <Icon icon={ChevronDown} size={16} color="muted-foreground" />
        </Pressable>
        <Pressable onPress={goToToday} accessibilityRole="button" accessibilityLabel="Go to today" hitSlop={8}>
          <Caption className="font-medium text-primary">Today</Caption>
        </Pressable>
      </View>

      <View className="mx-4 mt-2 flex-row gap-3">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
          <Icon icon={METRIC_ICONS.streak} size={16} color="warning" />
          <Caption className="text-sm font-medium text-foreground">{streak} week streak</Caption>
        </View>
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
          <Icon icon={Moon} size={16} color="info" />
          <Caption className="text-sm font-medium text-foreground">{restDays} rest days</Caption>
        </View>
      </View>

      {maxVolume > 0 ? (
        <View className="mx-4 mt-2 flex-row items-center justify-end gap-1.5">
          <Caption className="mr-1 text-xs">Volume</Caption>
          {[1, 2, 3, 4].map((level) => (
            <View
              key={level}
              className={cn('h-2.5 w-2.5 rounded-sm', HEAT_BG[level as 1 | 2 | 3 | 4])}
            />
          ))}
        </View>
      ) : null}

      <View className="mx-4 mt-3 flex-row border-b border-border pb-2">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Caption className="text-xs">{label}</Caption>
          </View>
        ))}
      </View>

      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={(m) => `${m.year}-${m.month}`}
        renderItem={renderMonth}
        getItemLayout={getItemLayout}
        initialScrollIndex={Math.max(0, months.length - 1)}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => scrollToIndex(info.index, false), 80);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onLayout={handleLayout}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: SCREEN_CONTENT.paddingHorizontal, paddingBottom: BOTTOM_PADDING }}
      />

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen} title="Jump to month" scroll>
        <Caption className="mb-2">Year</Caption>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {years.map((y) => (
            <Chip key={y} label={String(y)} selected={pickerYear === y} onPress={() => setPickerYear(y)} />
          ))}
        </View>
        <Caption className="mb-2">Month</Caption>
        <View className="flex-row flex-wrap gap-2 pb-2">
          {MONTH_SHORT.map((label, month) => {
            const available = months.some((m) => m.year === pickerYear && m.month === month);
            const count = monthActivity.get(`${pickerYear}-${month + 1}`) ?? 0;
            return (
              <Pressable
                key={label}
                disabled={!available}
                onPress={() => jumpToMonth(pickerYear, month)}
                className={cn(
                  'min-w-[22%] flex-1 items-center rounded-2xl border px-2 py-3',
                  available ? 'border-border bg-card' : 'border-transparent opacity-35',
                  visible.year === pickerYear && visible.month === month && 'border-primary bg-primary/10',
                )}>
                <Body className="text-sm font-medium text-foreground">{label}</Body>
                {count > 0 ? (
                  <View className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />
                ) : (
                  <View className="mt-1.5 h-1.5" />
                )}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {showSpinner ? (
        <View pointerEvents="auto" className="absolute inset-0 z-50 items-center justify-center bg-background">
          <PrimaryActivityIndicator />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
