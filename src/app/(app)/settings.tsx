import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Moon, Sun, Smartphone, Vibrate, Ruler, Bell, BellOff, Timer, Zap, Palette,
  Cloud, RefreshCw, CalendarDays, MonitorSmartphone,
} from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/common/chip';
import { Button } from '@/components/ui/button';
import { useSettings, DEFAULT_REST_OPTIONS } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { saveProfile } from '@/db/queries';
import { ACCENT_THEME_LIST } from '@/lib/accent-themes';
import { SCREEN_CONTENT } from '@/lib/layout';
import { METRIC_ICONS } from '@/lib/metric-icons';
import { useAppColorScheme } from '@/lib/use-color-scheme';
import { cn } from '@/lib/cn';
import type { Unit } from '@/db/types';

/** Inline control on the right (switches, short chip rows). */
function Row({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">{icon}</View>
      <View className="min-w-0 flex-1">
        <Body className="font-medium text-foreground">{title}</Body>
        {subtitle ? <Caption className="mt-0.5">{subtitle}</Caption> : null}
      </View>
      {children}
    </View>
  );
}

/** Title on top, full-width controls below — for chip groups that wrap. */
function StackedRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3 py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">{icon}</View>
        <View className="min-w-0 flex-1">
          <Body className="font-medium text-foreground">{title}</Body>
          {subtitle ? <Caption className="mt-0.5">{subtitle}</Caption> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function formatSyncTime(ms: number | null | undefined): string {
  if (!ms) return 'Never';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return 'Never';
  }
}

export default function SettingsScreen() {
  const {
    unit, themeMode, accentTheme, hapticsEnabled,
    restSoundEnabled, autoStartRest, defaultRestSeconds, showWarmUpSets,
    calendarHeatMetric, weekStartsOn, keepScreenAwake,
    setUnit, setThemeMode, setAccentTheme, setHaptics, setRestSound, setAutoStartRest, setDefaultRestSeconds, setShowWarmUpSets,
    setCalendarHeatMetric, setWeekStartsOn, setKeepScreenAwake,
  } = useSettings();
  const { data: profile, refetch } = useProfile();
  const scheme = useAppColorScheme();
  const selectedAccent = ACCENT_THEME_LIST.find((t) => t.id === accentTheme) ?? ACCENT_THEME_LIST[0];
  const { status, pending, syncing, enabled, syncNow } = useCloudSync({ auto: false });

  const changeUnit = (u: Unit) => {
    setUnit(u);
    if (profile) saveProfile({ unit: u }).then(refetch);
  };

  const syncSubtitle = !enabled
    ? 'Configure Supabase + Clerk JWT to enable backup'
    : status?.lastError
      ? status.lastError
      : pending > 0
        ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload`
        : `Last synced ${formatSyncTime(status?.lastPullAt ?? status?.lastPushAt)}`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SCREEN_CONTENT}>
        <Caption className="mb-1 mt-1 font-semibold uppercase tracking-wide">Cloud sync</Caption>
        <Card>
          <Row
            icon={<Icon icon={Cloud} size={18} color="muted-foreground" />}
            title={syncing ? 'Syncing…' : status?.status === 'error' ? 'Sync error' : 'Backup & restore'}
            subtitle={syncSubtitle}>
            <Button
              size="icon"
              variant="tonal"
              disabled={!enabled || syncing}
              onPress={() => void syncNow()}
              accessibilityLabel="Sync now">
              <Icon icon={RefreshCw} size={16} color="primary" />
            </Button>
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Units</Caption>
        <Card>
          <Row icon={<Icon icon={Ruler} size={18} color="muted-foreground" />} title="Measurement" subtitle="Displayed across workouts and stats">
            <View className="flex-row gap-2">
              <Chip label="kg" selected={unit === 'metric'} onPress={() => changeUnit('metric')} />
              <Chip label="lb" selected={unit === 'imperial'} onPress={() => changeUnit('imperial')} />
            </View>
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Workout</Caption>
        <Card>
          <Row icon={<Icon icon={Zap} size={18} color="muted-foreground" />} title="Auto-start rest timer" subtitle="Begin countdown when you finish a set">
            <Switch value={autoStartRest} onValueChange={setAutoStartRest} accessibilityLabel="Auto-start rest timer" />
          </Row>
          <View className="h-px bg-border/60" />
          <StackedRow icon={<Icon icon={Timer} size={18} color="muted-foreground" />} title="Default rest" subtitle="Used for newly added exercises">
            <View className="flex-row flex-wrap gap-1.5">
              {DEFAULT_REST_OPTIONS.map((s) => (
                <Chip key={s} size="sm" label={`${s}s`} selected={defaultRestSeconds === s} onPress={() => setDefaultRestSeconds(s)} />
              ))}
            </View>
          </StackedRow>
          <View className="h-px bg-border/60" />
          <Row icon={restSoundEnabled ? <Icon icon={Bell} size={18} color="muted-foreground" /> : <Icon icon={BellOff} size={18} color="muted-foreground" />} title="Rest timer alerts" subtitle="Chime in-app and notify if you leave the session">
            <Switch value={restSoundEnabled} onValueChange={setRestSound} accessibilityLabel="Rest timer alerts" />
          </Row>
          <View className="h-px bg-border/60" />
          <Row icon={<Icon icon={METRIC_ICONS.warmUp} size={18} color="muted-foreground" />} title="Warm-up set button" subtitle="Quick 50% set in the session">
            <Switch value={showWarmUpSets} onValueChange={setShowWarmUpSets} accessibilityLabel="Warm-up set button" />
          </Row>
          <View className="h-px bg-border/60" />
          <Row
            icon={<Icon icon={MonitorSmartphone} size={18} color="muted-foreground" />}
            title="Keep screen on"
            subtitle="While a workout session is open">
            <Switch value={keepScreenAwake} onValueChange={setKeepScreenAwake} accessibilityLabel="Keep screen on during workout" />
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Calendar</Caption>
        <Card>
          <StackedRow
            icon={<Icon icon={METRIC_ICONS.sessions} size={18} color="muted-foreground" />}
            title="Month day color"
            subtitle="What each tinted day represents">
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  { id: 'presence' as const, label: 'Trained' },
                  { id: 'volume' as const, label: 'Volume' },
                  { id: 'intensity' as const, label: 'Intensity' },
                  { id: 'reps' as const, label: 'Reps' },
                ]
              ).map((opt) => (
                <Chip
                  key={opt.id}
                  size="sm"
                  label={opt.label}
                  selected={calendarHeatMetric === opt.id}
                  onPress={() => setCalendarHeatMetric(opt.id)}
                />
              ))}
            </View>
          </StackedRow>
          <View className="h-px bg-border/60" />
          <Row
            icon={<Icon icon={CalendarDays} size={18} color="muted-foreground" />}
            title="Week starts on"
            subtitle="Calendar grids and day headers">
            <View className="flex-row gap-2">
              <Chip label="Mon" selected={weekStartsOn === 'monday'} onPress={() => setWeekStartsOn('monday')} />
              <Chip label="Sun" selected={weekStartsOn === 'sunday'} onPress={() => setWeekStartsOn('sunday')} />
            </View>
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Appearance</Caption>
        <Card>
          <StackedRow
            icon={themeMode === 'dark' ? <Icon icon={Moon} size={18} color="muted-foreground" /> : themeMode === 'light' ? <Icon icon={Sun} size={18} color="muted-foreground" /> : <Icon icon={Smartphone} size={18} color="muted-foreground" />}
            title="Theme">
            <View className="flex-row flex-wrap gap-2">
              <Chip label="System" selected={themeMode === 'system'} onPress={() => setThemeMode('system')} />
              <Chip label="Light" selected={themeMode === 'light'} onPress={() => setThemeMode('light')} />
              <Chip label="Dark" selected={themeMode === 'dark'} onPress={() => setThemeMode('dark')} />
            </View>
          </StackedRow>
          <View className="h-px bg-border/60" />
          <View className="py-3">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Icon icon={Palette} size={18} color="muted-foreground" />
              </View>
              <View className="flex-1">
                <Body className="font-medium text-foreground">Accent</Body>
                <Caption className="mt-0.5">{selectedAccent.description}</Caption>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-3 px-1">
              {ACCENT_THEME_LIST.map((theme) => {
                const selected = accentTheme === theme.id;
                const swatch = scheme === 'dark' ? theme.hex.dark : theme.hex.light;
                return (
                  <Pressable
                    key={theme.id}
                    onPress={() => setAccentTheme(theme.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${theme.label} accent`}
                    className="items-center gap-1.5"
                    style={{ width: 56 }}>
                    <View
                      className={cn(
                        'h-10 w-10 items-center justify-center rounded-full border-2',
                        selected ? 'border-foreground' : 'border-transparent',
                      )}>
                      <View className="h-8 w-8 rounded-full" style={{ backgroundColor: swatch }} />
                    </View>
                    <Caption className={cn('text-center text-[11px]', selected ? 'font-semibold text-foreground' : '')}>
                      {theme.label}
                    </Caption>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Feedback</Caption>
        <Card>
          <Row icon={<Icon icon={Vibrate} size={18} color="muted-foreground" />} title="Haptics" subtitle="Subtle vibration feedback">
            <Switch value={hapticsEnabled} onValueChange={setHaptics} accessibilityLabel="Haptics" />
          </Row>
        </Card>

        <Caption className="mt-6 text-center">Incline · Built with Expo</Caption>
      </ScrollView>
    </SafeAreaView>
  );
}
