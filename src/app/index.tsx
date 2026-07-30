import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { useDatabaseReady } from '@/hooks/use-database';
import { useProfile } from '@/hooks/use-data';

/**
 * Root gate: waits for the database, then routes to onboarding or the app
 * based on the persisted profile. Rendered as the root index so the Stack has
 * a deterministic entry point before the redirect resolves.
 */
export default function Gate() {
  const ready = useDatabaseReady();
  const { data: profile, loading } = useProfile();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready || loading || !profile) return;
    const inOnboarding = segments[0] === '(onboarding)';
    const inApp = segments[0] === '(app)';
    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (profile.onboardingCompleted && !inApp) {
      router.replace('/(app)/(tabs)');
    }
  }, [ready, loading, profile, segments, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#16a34a" />
    </View>
  );
}
