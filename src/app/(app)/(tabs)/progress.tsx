import { useMemo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Dumbbell, Layers, TrendingUp } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import { SectionHeader } from '@/components/common/section-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { SegmentedControl } from '@/components/common/segmented-control';
import { VolumeChart } from '@/components/progress/volume-chart';
import { MuscleDonut } from '@/components/progress/muscle-donut';
import { TrendChip } from '@/components/progress/trend-chip';
import { PRCard } from '@/components/progress/pr-card';
import { HistoryRow } from '@/components/progress/history-row';
import { usePeriodStats, useWorkoutLogs } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { formatVolume } from '@/db/calc';
import type { ProgressRange } from '@/db/types';

const RANGES: { value: ProgressRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'all', label: 'All' },
];

function weekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short' });
}

export default function ProgressScreen() {
  const { unit } = useSettings();
  const [range, setRange] = useState<ProgressRange>('1m');
  const { data: stats, loading, error, refetch } = usePeriodStats(range);
  const history = useWorkoutLogs();

  const volumeData = useMemo(() => {
    if (!stats) return [];
    if (range === '6m' || range === 'all') {
      return stats.monthlyVolume.map((w) => ({ label: monthLabel(w.month), value: w.volume }));
    }
    return stats.weeklyVolume.map((w) => ({ label: weekLabel(w.weekStart), value: w.volume }));
  }, [stats, range]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlashList
        data={history.items}
        renderItem={({ item }) => <HistoryRow log={item} unit={unit} />}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        onEndReached={history.loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View className="mb-4 gap-5">
            <View className="mt-2">
              <Heading>Progress</Heading>
              <Caption className="mt-1">Your training history at a glance.</Caption>
            </View>

            <SegmentedControl value={range} onChange={setRange} values={RANGES} />

            {loading && !stats ? (
              <View className="flex-row gap-3">
                <ListSkeleton count={1} />
              </View>
            ) : error ? (
              <ErrorState onRetry={refetch} />
            ) : stats ? (
              <>
                <View className="flex-row gap-3">
                  <StatCard label="Sessions" value={stats.sessions} icon={<Icon icon={Dumbbell} size={16} color="primary" />} accent />
                  <StatCard label="Volume" value={formatVolume(stats.totalVolume, unit)} icon={<Icon icon={Layers} size={16} color="info" />} />
                  <StatCard label="Streak" value={`${stats.streak}w`} icon={<Icon icon={Flame} size={16} color="warning" />} />
                </View>

                {stats.trend ? (
                  <View className="flex-row flex-wrap gap-2">
                    <TrendChip label="vs previous" delta={stats.trend.volumeDelta} />
                    <TrendChip label="sessions" delta={stats.trend.sessionsDelta} />
                  </View>
                ) : null}

                <Card>
                  <CardHeader>
                    <View>
                      <CardTitle>Volume</CardTitle>
                      <CardDescription>{range === 'all' ? 'All time' : `Last ${range}`}</CardDescription>
                    </View>
                    <Icon icon={TrendingUp} size={18} color="muted-foreground" />
                  </CardHeader>
                  <VolumeChart data={volumeData} unit={unit} />
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Muscle focus</CardTitle>
                    <CardDescription>Set share this period</CardDescription>
                  </CardHeader>
                  <MuscleDonut data={stats.muscleDistribution} unit={unit} className="mt-2" />
                </Card>

                <View>
                  <SectionHeader title="Records" className="mb-3" />
                  {stats.prs.length > 0 ? (
                    <View className="gap-2.5">
                      {stats.prs.slice(0, 5).map((pr) => (
                        <PRCard key={pr.exerciseId} pr={pr} unit={unit} />
                      ))}
                    </View>
                  ) : (
                    <EmptyState title="No records yet" description="Log a few workouts to see your PRs." />
                  )}
                </View>

                <SectionHeader title="History" className="mt-1" />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          history.items.length === 0 && !history.loading ? (
            <EmptyState
              icon={<Icon icon={Dumbbell} size={28} color="muted-foreground" />}
              title="No workouts logged"
              description="Complete a workout to start building your history."
            />
          ) : null
        }
        ListFooterComponent={
          history.loading && history.items.length > 0 ? (
            <View className="py-4"><ActivityIndicator color="#16a34a" /></View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
