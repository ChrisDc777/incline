import * as React from 'react';
import { View, TextInput, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn, useSSO } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { Heading, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const onGooglePress = React.useCallback(async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/(app)/(tabs)'),
      });
      if (result.createdSessionId) {
        await result.setActive?.({ session: result.createdSessionId });
        router.replace('/(app)/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

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
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-8 items-center">
          <Image
            source={require('../../../assets/images/icon.png')}
            className="mb-4 h-20 w-20 rounded-2xl"
            resizeMode="contain"
          />
          <Heading className="text-center">Incline</Heading>
          <Caption className="mt-2 text-center">
            Sign in to continue your training.
          </Caption>
        </View>

        <View className="gap-4">
          <Button
            size="lg"
            variant="outline"
            onPress={onGooglePress}
            disabled={googleLoading}>
            {googleLoading ? 'Opening Google…' : 'Continue with Google'}
          </Button>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Caption>or</Caption>
            <View className="h-px flex-1 bg-border" />
          </View>

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
