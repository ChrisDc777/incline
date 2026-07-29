import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, Dumbbell, BarChart3, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/common/icon';
import { useActiveSession } from '@/hooks/use-active-session';
import { ActiveSessionBar } from '@/components/workout/active-session-bar';

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
 * Custom premium tab bar. Renders the active-session mini-bar above the tabs
 * whenever a workout is in progress.
 */
export function AppTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { session, refetch } = useActiveSession();

  return (
    <BlurView intensity={80} tint="systemChromeMaterial" className="border-t border-border/40">
      {session ? (
        <ActiveSessionBar logId={session.id} name={session.name} startedAt={session.startedAt} refetch={refetch} />
      ) : null}
      <View className="flex-row" style={{ paddingBottom: insets.bottom, paddingTop: 6, height: 52 + insets.bottom }}>
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
              className="flex-1 items-center py-1.5">
              <Icon icon={TabIcon} size={22} color={focused ? 'primary' : 'muted-foreground'} />
              <Text className={cn('mt-1 text-[10px]', focused ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}
