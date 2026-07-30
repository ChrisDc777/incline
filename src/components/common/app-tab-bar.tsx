import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Dumbbell, BarChart3, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/common/icon';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveSession } from '@/hooks/use-active-session';
import { ActiveSessionBar } from '@/components/workout/active-session-bar';
import { discardWorkout } from '@/db/queries';
import { useActiveWorkout } from '@/store/active-workout-store';

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
  const { session, refetch, nextExercise } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const [discardOpen, setDiscardOpen] = useState(false);

  const handleDiscard = async () => {
    if (!session) return;
    setDiscardOpen(false);
    await discardWorkout(session.id);
    clear();
    refetch();
  };

  return (
    <View className="border-t border-[#2c2c2e] bg-[#1c1c1e]">
      {session ? (
        <ActiveSessionBar logId={session.id} name={session.name} startedAt={session.startedAt} nextExercise={nextExercise} refetch={refetch} onDiscard={() => setDiscardOpen(true)} />
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
              <Icon icon={TabIcon} size={22} color={focused ? '#25ca62' : '#8e8e93'} />
              <Text className={cn('mt-1 text-[10px]', focused ? 'font-semibold text-[#25ca62]' : 'text-[#8e8e93]')}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Dialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard workout?"
        description="This session and all logged sets will be permanently deleted."
        footer={
          <>
            <Button variant="outline" onPress={() => setDiscardOpen(false)}>Cancel</Button>
            <Button variant="destructive" onPress={handleDiscard}>Discard</Button>
          </>
        }
      />
    </View>
  );
}
