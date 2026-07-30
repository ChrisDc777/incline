import * as React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';

import { Heading, Body, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: emailAddress, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(app)/(tabs)');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-8">
        <View className="mb-8 items-center">
          <Heading className="text-center">Welcome back</Heading>
          <Caption className="mt-2 text-center">
            Sign in to continue your training.
          </Caption>
        </View>

        <View className="gap-4">
          <View className="gap-1.5">
            <Caption>Email</Caption>
            <TextInput
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            />
          </View>

          <View className="gap-1.5">
            <Caption>Password</Caption>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#6b7280"
              secureTextEntry
              autoComplete="password"
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
            />
          </View>

          {error ? (
            <Caption className="text-destructive">{error}</Caption>
          ) : null}

          <Button size="lg" onPress={onSignInPress} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <View className="items-center">
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <Text className="text-sm text-muted-foreground">
                Don&apos;t have an account? <Text className="font-semibold text-primary">Sign up</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
