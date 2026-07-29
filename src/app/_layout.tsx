import '@/global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { cn } from '@/lib/cn';
import { ToastProvider } from '@/components/ui/toast';
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
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={cn('flex-1', isDark && 'dark')}>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="exercise/[id]" options={{ headerShown: true, title: 'Exercise' }} />
              <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: 'Workout' }} />
              <Stack.Screen name="session/[id]" options={{ headerShown: true, title: 'Workout' }} />
              <Stack.Screen name="summary/[id]" options={{ headerShown: true, title: 'Summary' }} />
              <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
            </Stack>
          </ToastProvider>
        </View>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
