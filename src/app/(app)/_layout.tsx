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
    </Stack>
  );
}
