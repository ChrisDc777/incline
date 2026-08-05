import { Stack } from 'expo-router';

/** App group: tabs at the root, settings pushed on top (hides the tab bar). */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="exercises" options={{ headerShown: true, title: 'Exercises' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="template/[id]" options={{ headerShown: true, title: 'Routine' }} />
      <Stack.Screen name="program/[id]" options={{ headerShown: true, title: 'Program' }} />
      <Stack.Screen name="bodyweight" options={{ headerShown: true, title: 'Measurements' }} />
      <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Calendar' }} />
      <Stack.Screen name="calculator" options={{ headerShown: false }} />
      <Stack.Screen name="plate-calculator" options={{ headerShown: false }} />
      <Stack.Screen name="day/[ms]" options={{ headerShown: false }} />
    </Stack>
  );
}
