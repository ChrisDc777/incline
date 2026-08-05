import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Moon, Sun, Smartphone, Vibrate, Ruler, Dumbbell, Bell, BellOff, Timer, Zap, Palette } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/common/chip';
import { useSettings, DEFAULT_REST_OPTIONS } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import { saveProfile } from '@/db/queries';
import { ACCENT_THEME_LIST } from '@/lib/accent-themes';
import { useAppColorScheme } from '@/lib/use-color-scheme';
import { cn } from '@/lib/cn';
import type { Unit } from '@/db/types';

function Row({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">{icon}</View>
      <View className="flex-1">
        <Body className="font-medium text-foreground">{title}</Body>
        {subtitle ? <Caption className="mt-0.5">{subtitle}</Caption> : null}
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const {
    unit, themeMode, accentTheme, hapticsEnabled,
    restSoundEnabled, autoStartRest, defaultRestSeconds, showWarmUpSets,
    setUnit, setThemeMode, setAccentTheme, setHaptics, setRestSound, setAutoStartRest, setDefaultRestSeconds, setShowWarmUpSets,
  } = useSettings();
  const { data: profile, refetch } = useProfile();
  const scheme = useAppColorScheme();
  const selectedAccent = ACCENT_THEME_LIST.find((t) => t.id === accentTheme) ?? ACCENT_THEME_LIST[0];

  const changeUnit = (u: Unit) => {
    setUnit(u);
    if (profile) saveProfile({ unit: u }).then(refetch);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Heading>Settings</Heading>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Units</Caption>
        <Card>
          <Row icon={<Icon icon={Ruler} size={18} color="primary" />} title="Measurement" subtitle="Displayed across workouts and stats">
            <View className="flex-row gap-2">
              <Chip label="kg" selected={unit === 'metric'} onPress={() => changeUnit('metric')} />
              <Chip label="lb" selected={unit === 'imperial'} onPress={() => changeUnit('imperial')} />
            </View>
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Workout</Caption>
        <Card>
          <Row icon={<Icon icon={Zap} size={18} color="primary" />} title="Auto-start rest timer" subtitle="Begin countdown when you finish a set">
            <Switch value={autoStartRest} onValueChange={setAutoStartRest} accessibilityLabel="Auto-start rest timer" />
          </Row>
          <View className="h-px bg-border/60" />
          <Row icon={<Icon icon={Timer} size={18} color="primary" />} title="Default rest" subtitle="Used for newly added exercises">
            <View className="flex-row gap-1.5">
              {DEFAULT_REST_OPTIONS.map((s) => (
                <Chip key={s} size="sm" label={`${s}s`} selected={defaultRestSeconds === s} onPress={() => setDefaultRestSeconds(s)} />
              ))}
            </View>
          </Row>
          <View className="h-px bg-border/60" />
          <Row icon={restSoundEnabled ? <Icon icon={Bell} size={18} color="primary" /> : <Icon icon={BellOff} size={18} color="primary" />} title="Rest timer sound" subtitle="Chime + vibration when rest ends">
            <Switch value={restSoundEnabled} onValueChange={setRestSound} accessibilityLabel="Rest timer sound" />
          </Row>
          <View className="h-px bg-border/60" />
          <Row icon={<Icon icon={Dumbbell} size={18} color="primary" />} title="Warm-up set button" subtitle="Quick 50% set in the session">
            <Switch value={showWarmUpSets} onValueChange={setShowWarmUpSets} accessibilityLabel="Warm-up set button" />
          </Row>
        </Card>

        <Caption className="mb-1 mt-5 font-semibold uppercase tracking-wide">Appearance</Caption>
        <Card>
          <Row icon={themeMode === 'dark' ? <Icon icon={Moon} size={18} color="primary" /> : themeMode === 'light' ? <Icon icon={Sun} size={18} color="primary" /> : <Icon icon={Smartphone} size={18} color="primary" />} title="Theme">
            <View className="flex-row gap-2">
              <Chip label="System" selected={themeMode === 'system'} onPress={() => setThemeMode('system')} />
              <Chip label="Light" selected={themeMode === 'light'} onPress={() => setThemeMode('light')} />
              <Chip label="Dark" selected={themeMode === 'dark'} onPress={() => setThemeMode('dark')} />
            </View>
          </Row>
          <View className="h-px bg-border/60" />
          <View className="py-3">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Icon icon={Palette} size={18} color="primary" />
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
          <Row icon={<Icon icon={Vibrate} size={18} color="primary" />} title="Haptics" subtitle="Subtle vibration feedback">
            <Switch value={hapticsEnabled} onValueChange={setHaptics} accessibilityLabel="Haptics" />
          </Row>
        </Card>

        <Caption className="mt-6 text-center">Incline · MVP · Built with Expo</Caption>
      </ScrollView>
    </SafeAreaView>
  );
}
