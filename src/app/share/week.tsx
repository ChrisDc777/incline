import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { Icon } from '@/components/common/icon';
import { Body, Caption } from '@/components/common/text';
import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';
import { Chip } from '@/components/common/chip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  WeekShareCoverSlide,
  WeekShareMusclesSlide,
  WeekSharePrsSlide,
  WeekShareStatsSlide,
} from '@/components/report/week-share-slides';
import { formatVolume, startOfWeek, formatWeekRangeLabel } from '@/db/calc';
import { useProfile, useWeeklyRecap } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import type { MuscleGroup } from '@/db/types';

type SlideId = 'cover' | 'stats' | 'prs' | 'muscles';

const SLIDES: { id: SlideId; label: string }[] = [
  { id: 'cover', label: 'Cover' },
  { id: 'stats', label: 'Stats' },
  { id: 'prs', label: 'PRs' },
  { id: 'muscles', label: 'Muscles' },
];

export default function ShareWeekScreen() {
  const { weekStartMs: weekStartParam } = useLocalSearchParams<{ weekStartMs?: string }>();
  const [defaultWeekStart] = useState(() => startOfWeek(Date.now()));
  const weekStartMs = weekStartParam ? Number(weekStartParam) : defaultWeekStart;
  const router = useRouter();
  const { toast } = useToast();
  const { unit } = useSettings();
  const { data: profile } = useProfile();
  const { data: recap, loading } = useWeeklyRecap(weekStartMs);
  const [slide, setSlide] = useState<SlideId>('cover');
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  const athleteName = profile?.name?.trim() || 'Athlete';
  const rangeLabel = formatWeekRangeLabel(weekStartMs);
  const muscles = useMemo(
    () => (recap?.muscles ?? []).map((m) => m.muscle) as MuscleGroup[],
    [recap?.muscles],
  );

  const shareWeek = async () => {
    if (!recap || sharing) return;
    setSharing(true);
    const message = [
      `My week on Incline (${rangeLabel})`,
      recap.insightLine,
      '',
      'Train with me on Incline',
    ].join('\n');
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
          dialogTitle: 'Share weekly report',
        });
      } else {
        await Share.share({ message, title: 'My week on Incline' });
      }
    } catch {
      toast({ title: 'Could not share week', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  if (loading || !recap) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <PrimaryActivityIndicator />
      </SafeAreaView>
    );
  }

  const volumeLabel = formatVolume(recap.totalVolume, unit);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Pressable onPress={() => router.back()} className="p-1" accessibilityRole="button" accessibilityLabel="Go back">
          <Icon icon={ArrowLeft} size={24} color="foreground" />
        </Pressable>
        <Body className="text-base font-semibold text-foreground">Share week</Body>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Caption className="mb-3">Pick a slide, then share an image.</Caption>
        <View className="mb-4 flex-row flex-wrap gap-1.5">
          {SLIDES.map((s) => (
            <Chip
              key={s.id}
              size="sm"
              label={s.label}
              selected={slide === s.id}
              onPress={() => setSlide(s.id)}
            />
          ))}
        </View>

        <ViewShot options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <View ref={shareRef} collapsable={false}>
            {slide === 'cover' ? (
              <WeekShareCoverSlide
                athleteName={athleteName}
                rangeLabel={rangeLabel}
                insightLine={recap.insightLine}
              />
            ) : null}
            {slide === 'stats' ? (
              <WeekShareStatsSlide
                sessions={recap.sessions}
                volumeLabel={volumeLabel}
                sets={recap.totalSets}
                streak={recap.streak}
                volumeDeltaPct={recap.volumeDeltaPct}
              />
            ) : null}
            {slide === 'prs' ? <WeekSharePrsSlide prs={recap.prs} unit={unit} /> : null}
            {slide === 'muscles' ? <WeekShareMusclesSlide muscles={muscles} /> : null}
          </View>
        </ViewShot>
      </ScrollView>

      <View className="px-4 pb-4">
        <Button
          leftIcon={<Icon icon={Share2} size={16} color="primary-foreground" />}
          onPress={() => void shareWeek()}
          disabled={sharing}>
          {sharing ? 'Sharing…' : 'Share slide'}
        </Button>
      </View>
    </SafeAreaView>
  );
}
