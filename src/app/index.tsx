import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { PrimaryActivityIndicator } from '@/components/common/primary-activity-indicator';
import { bindLocalAccount } from '@/db/account';
import { useDatabaseReady } from '@/hooks/use-database';
import { useProfile } from '@/hooks/use-data';

/**
 * Root gate: routes based on auth state → onboarding → app.
 * Flow: unauthenticated → (auth)/sign-in → (onboarding) → (app)/(tabs)
 */
export default function Gate() {
  const ready = useDatabaseReady();
  const { isSignedIn, isLoaded: authLoaded, userId } = useAuth();
  const { data: profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const router = useRouter();
  const segments = useSegments();
  const [bound, setBound] = useState(false);

  // Bind Clerk identity to local SQLite owner before routing into the app.
  useEffect(() => {
    if (!ready || !authLoaded || !isSignedIn || !userId) {
      setBound(!isSignedIn);
      return;
    }
    let active = true;
    bindLocalAccount(userId)
      .then(async (result) => {
        if (result.switched) await refetchProfile();
        if (active) setBound(true);
      })
      .catch((err) => {
        console.warn('[gate] bindLocalAccount failed', err);
        if (active) setBound(true);
      });
    return () => {
      active = false;
    };
  }, [ready, authLoaded, isSignedIn, userId, refetchProfile]);

  useEffect(() => {
    if (!ready || !authLoaded || !bound || (isSignedIn && profileLoading)) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inApp = segments[0] === '(app)';

    // Not signed in → auth screen
    if (!isSignedIn) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }

    // Signed in but no profile row yet (first login) → onboarding
    if (!profile) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // Signed in, profile exists, onboarding not completed → onboarding
    // But also skip onboarding if essential fields (name) are already filled
    const needsOnboarding = !profile.onboardingCompleted && !profile.name;
    if (needsOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if ((profile.onboardingCompleted || profile.name) && !inApp) {
      router.replace('/(app)/(tabs)');
    }
  }, [ready, authLoaded, bound, isSignedIn, profileLoading, profile, segments, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <PrimaryActivityIndicator />
    </View>
  );
}
