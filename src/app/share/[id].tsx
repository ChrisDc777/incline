import { useCallback, useRef, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { Icon } from '@/components/common/icon';
import { Body, Caption } from '@/components/common/text';
import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';
import { Button } from '@/components/ui/button';
import { ShareSummaryCard } from '@/components/workout/share-summary-card';
import { getWorkoutLog, getWorkoutPrCount, getWorkoutMuscleSplit, type SessionWorkout } from '@/db/queries';
import { useProfile } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { useToast } from '@/components/ui/toast';
import { formatDuration, formatVolume } from '@/db/calc';
import type { MuscleGroup } from '@/db/types';

/** Invite line for WhatsApp / Messages — public workouts / friends come later. */
function buildShareMessage(opts: {
  workoutName: string;
  durationSeconds: number;
  volumeLabel: string;
  completedSets: number;
  prCount: number;
}): string {
  const stats = [
    formatDuration(opts.durationSeconds),
    opts.volumeLabel,
    `${opts.completedSets} sets`,
  ];
  if (opts.prCount > 0) stats.push(`${opts.prCount} PR${opts.prCount === 1 ? '' : 's'}`);
  return [
    `Just finished ${opts.workoutName} on Incline`,
    stats.join(' · '),
    '',
    'Train with me on Incline 💪',
  ].join('\n');
}

export default function ShareWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const router = useRouter();
  const { toast } = useToast();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const [log, setLog] = useState<SessionWorkout | null>(null);
  const [prCount, setPrCount] = useState(0);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [s, prs, split] = await Promise.all([
          getWorkoutLog(logId),
          getWorkoutPrCount(logId),
          getWorkoutMuscleSplit(logId),
        ]);
        if (!active) return;
        setLog(s);
        setPrCount(prs);
        setMuscles(split.map((x) => x.muscle));
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [logId]),
  );

  const athleteName = profile?.name?.trim() || 'Athlete';
  const volumeLabel = log ? formatVolume(log.totalVolume, unit) : '';
  const completedSets = log?.sets.filter((s) => s.completed).length ?? 0;

  const shareWorkout = async () => {
    if (!log || sharing) return;
    setSharing(true);
    const message = buildShareMessage({
      workoutName: log.name,
      durationSeconds: log.durationSeconds,
      volumeLabel,
      completedSets,
      prCount,
    });
    try {
      const canShareFile = await Sharing.isAvailableAsync();
      let uri: string | null = null;
      try {
        uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      } catch {
        uri = null;
      }
      if (canShareFile && uri) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share workout',
        });
      } else {
        await Share.share({ message, title: log.name });
      }
    } catch {
      toast({ title: 'Could not share workout', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <PrimaryActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Body className="text-center font-semibold text-foreground">Workout not found</Body>
        <Button className="mt-4" onPress={() => router.back()}>Go back</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Pressable onPress={() => router.back()} className="p-1" accessibilityRole="button" accessibilityLabel="Go back">
          <Icon icon={ArrowLeft} size={24} color="foreground" />
        </Pressable>
        <Body className="text-base font-semibold text-foreground">Share</Body>
        <View className="w-8" />
      </View>

      <View className="flex-1 px-4 pt-4">
        <Caption className="mb-3">
          Preview your card. More layouts and public workout links come later.
        </Caption>
        <ViewShot options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <View ref={shareRef} collapsable={false}>
            <ShareSummaryCard
              athleteName={athleteName}
              workoutName={log.name}
              durationSeconds={log.durationSeconds}
              volumeLabel={volumeLabel}
              completedSets={completedSets}
              prCount={prCount}
              muscles={muscles}
            />
          </View>
        </ViewShot>

        <Caption className="mt-4 text-muted-foreground">
          Shared messages include a short invite to join Incline.
        </Caption>
      </View>

      <View className="px-4 pb-4">
        <Button
          leftIcon={<Icon icon={Share2} size={16} color="primary-foreground" />}
          onPress={() => void shareWorkout()}
          disabled={sharing}>
          {sharing ? 'Sharing…' : 'Share'}
        </Button>
      </View>
    </SafeAreaView>
  );
}
