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
import { BarChart } from '@/components/progress/bar-chart';
import { WeeklyDistribution } from '@/components/progress/weekly-distribution';
import { PRCard } from '@/components/progress/pr-card';
import { HistoryRow } from '@/components/progress/history-row';
import { useProgressStats, useWorkoutLogs } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { formatVolume } from '@/db/calc';

function weekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ProgressScreen() {
  const { unit } = useSettings();
  const { data: stats, loading: statsLoading, error: statsError, refetch } = useProgressStats();
  const history = useWorkoutLogs();

  const volumeData = (stats?.weeklyVolume ?? []).map((w) => ({ label: weekLabel(w.weekStart), value: w.volume }));

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

            {statsLoading ? (
              <View className="flex-row gap-3">
                <ListSkeleton count={1} />
              </View>
            ) : statsError ? (
              <ErrorState onRetry={refetch} />
            ) : stats ? (
              <>
                <View className="flex-row gap-3">
                  <StatCard label="Sessions" value={stats.totalSessions} icon={<Icon icon={Dumbbell} size={16} color="primary" />} accent />
                  <StatCard label="Total volume" value={formatVolume(stats.totalVolume, unit)} icon={<Icon icon={Layers} size={16} color="info" />} />
                  <StatCard label="Streak" value={`${stats.streak}w`} icon={<Icon icon={Flame} size={16} color="warning" />} />
                </View>

                <Card>
                  <CardHeader>
                    <View>
                      <CardTitle>Weekly volume</CardTitle>
                      <CardDescription>Last 8 weeks</CardDescription>
                    </View>
                    <Icon icon={TrendingUp} size={18} color="muted-foreground" />
                  </CardHeader>
                  <View className="items-center">
                    <BarChart data={volumeData} formatValue={(v) => formatVolume(v, unit)} />
                  </View>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Muscle focus</CardTitle>
                    <CardDescription>Set distribution this period</CardDescription>
                  </CardHeader>
                  <WeeklyDistribution data={stats.muscleDistribution} unit={unit} className="mt-2" />
                </Card>

                <View>
                  <SectionHeader title="Personal records" className="mb-3" />
                  {stats.prs.length > 0 ? (
                    <View className="gap-2.5">
                      {stats.prs.map((pr) => (
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
