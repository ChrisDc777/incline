import { Pressable, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Dumbbell, BarChart3, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/common/icon';

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  workouts: Dumbbell,
  progress: BarChart3,
  profile: User,
};
const LABELS: Record<string, string> = {
  index: 'Home',
  workouts: 'Workouts',
  progress: 'Progress',
  profile: 'Profile',
};

/** Minimal shape of the props Expo Router's Tabs passes to a custom tabBar. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/**
 * Custom premium tab bar. The active-session pill is rendered separately by
 * the tabs layout as a floating overlay, so it is not part of the tab bar's
 * background.
 */
export function AppTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const tabBarBg = isDark ? 'bg-[#1c1c1e]' : 'bg-card';
  const borderCol = isDark ? 'border-[#2c2c2e]' : 'border-border';
  const activeColor = '#16a34a';
  const inactiveColor = '#8e8e93';

  return (
    <View className={cn('border-t', tabBarBg, borderCol)}>
      <View className="flex-row" style={{ paddingBottom: insets.bottom, paddingTop: 8, height: 64 + insets.bottom }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const TabIcon = ICONS[route.name] ?? Home;
          const label = LABELS[route.name] ?? route.name;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              className="flex-1 items-center py-2">
              <Icon icon={TabIcon} size={26} color={focused ? activeColor : inactiveColor} />
              <Text className={cn('mt-1.5 text-xs', focused ? 'font-semibold' : '')} style={{ color: focused ? activeColor : inactiveColor }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
