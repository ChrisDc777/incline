import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTabBar } from '@/components/common/app-tab-bar';
import { ActiveSessionBar } from '@/components/workout/active-session-bar';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveSession } from '@/hooks/use-active-session';
import { discardWorkout } from '@/db/queries';
import { useActiveWorkout } from '@/store/active-workout-store';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, refetch, nextExercise } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const [prompted, setPrompted] = useState(false);
  const [open, setOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const tabBarHeight = 64 + insets.bottom;

  // On cold start with an unfinished session, prompt to resume or discard.
  // Only show for sessions older than 5s (not a fresh start that's still animating).
  useEffect(() => {
    if (session && !prompted) {
      const ageMs = Date.now() - session.startedAt;
      if (ageMs > 5000) {
        setOpen(true);
      }
      setPrompted(true);
    }
  }, [session, prompted]);

  const resume = () => {
    setOpen(false);
    if (session) router.push(`/session/${session.id}`);
  };
  const discard = async () => {
    setOpen(false);
    if (session) {
      await discardWorkout(session.id);
      clear();
      refetch();
    }
  };
  const handleDiscard = async () => {
    setDiscardOpen(false);
    if (session) {
      await discardWorkout(session.id);
      clear();
      refetch();
    }
  };

  return (
    <>
      <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

      {session ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight, zIndex: 50 }}>
          <ActiveSessionBar
            logId={session.id}
            name={session.name}
            startedAt={session.startedAt}
            nextExercise={nextExercise}
            refetch={refetch}
            onDiscard={() => setDiscardOpen(true)}
          />
        </View>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Resume your workout?"
        description="You have an unfinished session. Pick up where you left off, or discard it to start fresh."
        footer={
          <>
            <Button variant="outline" onPress={discard}>
              Discard
            </Button>
            <Button onPress={resume}>Resume</Button>
          </>
        }
      />

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
    </>
  );
}
