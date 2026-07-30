import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { useDatabaseReady } from '@/hooks/use-database';
import { useProfile } from '@/hooks/use-data';

/**
 * Root gate: routes based on auth state → onboarding → app.
 * Flow: unauthenticated → (auth)/sign-in → (onboarding) → (app)/(tabs)
 */
export default function Gate() {
  const ready = useDatabaseReady();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { data: profile, loading: profileLoading } = useProfile();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready || !authLoaded || profileLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inApp = segments[0] === '(app)';

    // Not signed in → auth screen
    if (!isSignedIn) {
      if (!inAuth) router.replace('/(auth)/sign-in' as any);
      return;
    }

    // Signed in but no profile row yet (first login) → onboarding
    if (!profile) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // Signed in, profile exists, onboarding not completed → onboarding
    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (profile.onboardingCompleted && !inApp) {
      router.replace('/(app)/(tabs)');
    }
  }, [ready, authLoaded, isSignedIn, profileLoading, profile, segments, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#16a34a" />
    </View>
  );
}
