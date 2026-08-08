import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { Plus, ChevronDown, BarChart3 } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { SeriesAreaChart } from '@/components/progress/series-area-chart';
import { addBodyweightEntry, getBodyweightEntries, deleteBodyweightEntry } from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { SCREEN_CONTENT } from '@/lib/layout';
import { cn } from '@/lib/cn';

interface Entry {
  id: number;
  weight: number;
  unit: string;
  recordedAt: number;
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1m', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

function getRangeMs(range: TimeRange): number {
  switch (range) {
    case '1m': return 30 * 24 * 60 * 60 * 1000;
    case '3m': return 90 * 24 * 60 * 60 * 1000;
    case '6m': return 180 * 24 * 60 * 60 * 1000;
    case '1y': return 365 * 24 * 60 * 60 * 1000;
    case 'all': return Infinity;
  }
}

function MiniChart({ data, unit }: { data: Entry[]; unit: string }) {
  if (data.length < 2) {
    return (
      <View className="mt-4 items-center justify-center rounded-2xl border border-border/60 bg-card px-4 py-10">
        <Icon icon={BarChart3} size={36} color="muted-foreground" />
        <Body className="mt-3 text-muted-foreground">No data in time period</Body>
      </View>
    );
  }

  const points = [...data].reverse().map((e) => ({
    value: e.weight,
    label: new Date(e.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <View className="mt-4">
      <SeriesAreaChart
        title="Bodyweight"
        points={points}
        formatValue={(v) => v.toFixed(1)}
        valueHint={unit}
        height={150}
      />
    </View>
  );
}

function TimeRangeDropdown({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const [open, setOpen] = useState(false);
  const label = TIME_RANGES.find((r) => r.value === value)?.label ?? value;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1"
      >
        <Text className="text-sm font-medium text-primary">{label}</Text>
        <Icon icon={ChevronDown} size={14} color="primary" />
      </Pressable>

      <Dialog open={open} onOpenChange={setOpen} title="Time range">
        <View className="gap-1 py-2">
          {TIME_RANGES.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => { onChange(r.value); setOpen(false); }}
              className={cn(
                'rounded-xl px-4 py-3',
                value === r.value ? 'bg-primary/15' : 'active:bg-muted',
              )}
            >
              <Body className={cn(value === r.value ? 'font-semibold text-primary' : 'text-foreground')}>
                {r.label}
              </Body>
            </Pressable>
          ))}
        </View>
      </Dialog>
    </>
  );
}

export default function BodyweightScreen() {
  const navigation = useNavigation();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const { unit } = useSettings();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [addOpen, setAddOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const data = await getBodyweightEntries(timeRange === 'all' ? 365 : 365);
    setEntries(data);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setAddOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Add measurement"
          hitSlop={8}
          className="mr-1 p-2">
          <Icon icon={Plus} size={22} color="foreground" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const [now] = useState(() => Date.now());
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (timeRange === 'all') return true;
      return e.recordedAt >= now - getRangeMs(timeRange);
    });
  }, [entries, timeRange, now]);

  const addEntry = async () => {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(w) || w <= 0) {
      toast({ title: 'Enter a valid weight', variant: 'warning' });
      return;
    }
    await addBodyweightEntry(w, unit === 'metric' ? 'kg' : 'lb');
    impact();
    setAddOpen(false);
    setWeightInput('');
    toast({ title: 'Weight logged', variant: 'success' });
    load();
  };

  const removeEntry = async () => {
    if (deleteId === null) return;
    await deleteBodyweightEntry(deleteId);
    impact();
    setDeleteId(null);
    toast({ title: 'Entry deleted', variant: 'info' });
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SCREEN_CONTENT}>
        <View className="mt-2 items-end">
          <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
        </View>

        <MiniChart data={filteredEntries} unit={unit === 'metric' ? 'kg' : 'lb'} />

        <View className="mt-6">
          <Body className="text-base text-muted-foreground">Weight History</Body>

          {filteredEntries.length === 0 ? (
            <View className="items-center py-10">
              <Caption>No entries in this time period.</Caption>
            </View>
          ) : (
            <View className="mt-3">
              {filteredEntries.map((e, i) => (
                <Pressable
                  key={e.id}
                  onLongPress={() => setDeleteId(e.id)}
                  className="flex-row items-center justify-between border-b border-border/40 py-3.5"
                >
                  <Body className="text-sm text-foreground">
                    {new Date(e.recordedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Body>
                  <Body className="text-sm font-medium text-foreground">
                    {e.weight.toFixed(1)} {e.unit}
                  </Body>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Log bodyweight"
        footer={
          <>
            <Button variant="outline" onPress={() => setAddOpen(false)}>Cancel</Button>
            <Button onPress={addEntry}>Save</Button>
          </>
        }>
        <View className="gap-3 py-2">
          <Input
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={unit === 'metric' ? 'e.g. 75.5' : 'e.g. 166.4'}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Caption>{unit === 'metric' ? 'Kilograms' : 'Pounds'}</Caption>
        </View>
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete entry?"
        description="This cannot be undone."
        footer={
          <>
            <Button variant="outline" onPress={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onPress={removeEntry}>Delete</Button>
          </>
        }
      />
    </SafeAreaView>
  );
}
