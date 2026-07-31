import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';

import { AppTabBar } from '@/components/common/app-tab-bar';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveSession } from '@/hooks/use-active-session';
import { discardWorkout } from '@/db/queries';
import { useActiveWorkout } from '@/store/active-workout-store';

export default function TabsLayout() {
  const router = useRouter();
  const { session, refetch } = useActiveSession();
  const clear = useActiveWorkout((s) => s.clear);
  const [prompted, setPrompted] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

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
    </>
  );
}
