import '@/global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import { ClerkProvider } from '@clerk/clerk-expo';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { cn } from '@/lib/cn';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';
import { secureTokenCache } from '@/auth/secure-store';
import { ToastProvider } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { useDatabaseReady } from '@/hooks/use-database';
import { useAppColorScheme } from '@/lib/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const dbReady = useDatabaseReady();
  const scheme = useAppColorScheme();

  useEffect(() => {
    if (fontsLoaded && dbReady) SplashScreen.hideAsync();
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

  const isDark = scheme === 'dark';

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={secureTokenCache}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <ErrorBoundary>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <View className={cn('flex-1', isDark && 'dark')}>
                <ToastProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="exercise/[id]" options={{ headerShown: true, title: 'Exercise' }} />
                    <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: 'Workout' }} />
                    <Stack.Screen name="session/[id]" options={{ headerShown: true, title: 'Workout' }} />
                    <Stack.Screen name="summary/[id]" options={{ headerShown: true, title: 'Summary' }} />
                    <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
                  </Stack>
                </ToastProvider>
              </View>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      </ThemeProvider>
    </ClerkProvider>
  );
}
