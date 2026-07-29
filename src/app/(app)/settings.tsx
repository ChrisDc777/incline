import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Moon, Sun, Smartphone, Vibrate, Ruler } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/common/chip';
import { useSettings } from '@/store/settings-store';
import { useProfile } from '@/hooks/use-data';
import { saveProfile } from '@/db/queries';
import type { ThemeMode, Unit } from '@/db/types';

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">{icon}</View>
      <Body className="flex-1 font-medium text-foreground">{title}</Body>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { unit, themeMode, hapticsEnabled, setUnit, setThemeMode, setHaptics } = useSettings();
  const { data: profile, refetch } = useProfile();

  const changeUnit = (u: Unit) => {
    setUnit(u);
    if (profile) saveProfile({ unit: u }).then(refetch);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Heading>Settings</Heading>

        <Card className="mt-4">
          <Caption className="mb-1">Units</Caption>
          <Row icon={<Icon icon={Ruler} size={18} color="primary" />} title="Measurement">
            <View className="flex-row gap-2">
              <Chip label="Metric" selected={unit === 'metric'} onPress={() => changeUnit('metric')} />
              <Chip label="Imperial" selected={unit === 'imperial'} onPress={() => changeUnit('imperial')} />
            </View>
          </Row>
        </Card>

        <Card className="mt-3">
          <Caption className="mb-1">Appearance</Caption>
          <Row icon={themeMode === 'dark' ? <Icon icon={Moon} size={18} color="primary" /> : themeMode === 'light' ? <Icon icon={Sun} size={18} color="primary" /> : <Icon icon={Smartphone} size={18} color="primary" />} title="Theme">
            <View className="flex-row gap-2">
              <Chip label="System" selected={themeMode === 'system'} onPress={() => setThemeMode('system')} />
              <Chip label="Light" selected={themeMode === 'light'} onPress={() => setThemeMode('light')} />
              <Chip label="Dark" selected={themeMode === 'dark'} onPress={() => setThemeMode('dark')} />
            </View>
          </Row>
        </Card>

        <Card className="mt-3">
          <Caption className="mb-1">Feedback</Caption>
          <Row icon={<Icon icon={Vibrate} size={18} color="primary" />} title="Haptics">
            <Switch value={hapticsEnabled} onValueChange={setHaptics} accessibilityLabel="Haptics" />
          </Row>
        </Card>

        <Caption className="mt-6 text-center">Incline · MVP · Built with Expo</Caption>
      </ScrollView>
    </SafeAreaView>
  );
}
