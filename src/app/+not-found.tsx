import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Heading, Body } from '@/components/common/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Heading>Page not found</Heading>
        <Body className="mt-2 text-center text-muted-foreground">
          The screen you’re looking for doesn’t exist.
        </Body>
        <Link href="/(app)/(tabs)" asChild>
          <Button className="mt-6">Go home</Button>
        </Link>
      </View>
    </>
  );
}
