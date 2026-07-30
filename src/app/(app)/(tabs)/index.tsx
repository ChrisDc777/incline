import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Plus, Flame, TrendingUp, Dumbbell } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Hero, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { StatCard } from '@/components/common/stat-card';
import { SectionHeader } from '@/components/common/section-header';
import { PRCard } from '@/components/progress/pr-card';
import { HistoryRow } from '@/components/progress/history-row';
import { CardSkeleton } from '@/components/common/skeleton';
import { useProfile, useSuggestedTemplate, useProgressStats, useWorkoutLogs } from '@/hooks/use-data';
import { useActiveSession } from '@/hooks/use-active-session';
import { useSettings } from '@/store/settings-store';
import { useActiveWorkout } from '@/store/active-workout-store';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { startWorkout, discardWorkout } from '@/db/queries';
import { formatVolume, formatFullDate } from '@/db/calc';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const { data: suggested, loading: sugLoading } = useSuggestedTemplate();
  const { data: stats, loading: statsLoading } = useProgressStats();
  const { session } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const recentLogs = useWorkoutLogs();
  const [starting, setStarting] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<{ templateId: number | null; name: string } | null>(null);

  const doStart = async (templateId: number | null, name: string) => {
    setStarting(true);
    impact();
    try {
      const logId = await startWorkout(templateId, name);
      router.push(`/session/${logId}`);
    } catch {
      toast({ title: 'Could not start workout', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const beginTemplate = async (id: number, name: string) => {
    if (session) {
      setPendingStart({ templateId: id, name });
      setConflictOpen(true);
      return;
    }
    await doStart(id, name);
  };

  const quickStart = async () => {
    if (session) {
      setPendingStart({ templateId: null, name: 'Quick Workout' });
      setConflictOpen(true);
      return;
    }
    await doStart(null, 'Quick Workout');
  };

  const resumeActive = () => {
    setConflictOpen(false);
    if (session) router.push(`/session/${session.id}`);
    setPendingStart(null);
  };

  const startNewAndDiscard = async () => {
    setConflictOpen(false);
    if (session) {
      await discardWorkout(session.id);
      clear();
    }
    if (pendingStart) {
      await doStart(pendingStart.templateId, pendingStart.name);
    }
    setPendingStart(null);
  };

  const name = profile?.name?.trim() || 'Athlete';
  const hasData = (stats?.totalSessions ?? 0) > 0;
  const topPRs = (stats?.prs ?? []).slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Caption>{greeting()}</Caption>
        <Hero className="mt-0.5">Let's train, {name.split(' ')[0]}</Hero>
        <Body className="mt-1 text-muted-foreground">{formatFullDate(Date.now())}</Body>

        <View className="mt-6 gap-3">
          {sugLoading ? (
            <CardSkeleton />
          ) : suggested ? (
            <Pressable onPress={() => router.push(`/workout/${suggested.id}`)}>
              <Card>
                <View className="flex-row items-center justify-between">
                  <Caption>Today's workout</Caption>
                  <Caption>{suggested.estimatedMinutes} min</Caption>
                </View>
                <Body className="mt-2 font-semibold text-foreground">{suggested.name}</Body>
                <Body className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                  {suggested.description}
                </Body>
                <Button
                  className="mt-4"
                  leftIcon={<Icon icon={Play} size={16} color="primary-foreground" />}
                  onPress={() => beginTemplate(suggested.id, suggested.name)}
                  disabled={starting}>
                  Start workout
                </Button>
              </Card>
            </Pressable>
          ) : null}

          <Button
            variant="outline"
            size="lg"
            leftIcon={<Icon icon={Plus} size={18} color="primary" />}
            onPress={quickStart}
            disabled={starting}>
            Quick start
          </Button>
        </View>

        {hasData ? (
          <>
            <View className="mt-8 flex-row gap-3">
              <StatCard label="Streak" value={`${stats?.streak ?? 0}w`} icon={<Icon icon={Flame} size={16} color="warning" />} />
              <StatCard label="Sessions" value={stats?.totalSessions ?? 0} icon={<Icon icon={Dumbbell} size={16} color="primary" />} />
              <StatCard
                label="Volume"
                value={formatVolume(stats?.totalVolume ?? 0, unit)}
                icon={<Icon icon={TrendingUp} size={16} color="info" />}
              />
            </View>

            {topPRs.length > 0 ? (
              <View className="mt-8">
                <SectionHeader
                  title="Personal records"
                  action="See all"
                  onAction={() => router.push('/(app)/(tabs)/progress')}
                  className="mb-3"
                />
                <View className="gap-2.5">
                  {topPRs.map((pr) => (
                    <PRCard key={pr.exerciseId} pr={pr} unit={unit} />
                  ))}
                </View>
              </View>
            ) : null}

            {recentLogs.items.length > 0 ? (
              <View className="mt-8">
                <SectionHeader
                  title="Recent history"
                  action="See all"
                  onAction={() => router.push('/(app)/(tabs)/progress')}
                  className="mb-3"
                />
                <View className="gap-2">
                  {recentLogs.items.slice(0, 3).map((log) => (
                    <HistoryRow key={log.id} log={log} unit={unit} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : statsLoading ? (
          <View className="mt-8"><CardSkeleton /></View>
        ) : (
          <View className="mt-10">
            <Card className="items-center p-6">
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-primary/15">
                <Icon icon={Dumbbell} size={26} color="primary" />
              </View>
              <Body className="mt-4 text-center font-semibold text-foreground">Log your first workout</Body>
              <Caption className="mt-1 text-center">
                Start today's workout or a quick session to begin tracking progress.
              </Caption>
            </Card>
          </View>
        )}
      </ScrollView>

      <Dialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="You have a workout in progress"
        description="If you start a new workout, your old workout will be permanently deleted."
        footer={
          <View className="w-full gap-2">
            <Button onPress={resumeActive}>Resume workout in progress</Button>
            <Button variant="destructive" onPress={startNewAndDiscard}>Start new workout</Button>
            <Button variant="outline" onPress={() => { setConflictOpen(false); setPendingStart(null); }}>Cancel</Button>
          </View>
        }
      />
    </SafeAreaView>
  );
}
