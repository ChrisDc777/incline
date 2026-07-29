import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';

import { Heading, Body, Caption } from '@/components/common/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/common/chip';
import { useToast } from '@/components/ui/toast';
import { completeOnboarding } from '@/db/queries';
import { useSettings } from '@/store/settings-store';
import { GOAL_LABELS } from '@/lib/labels';
import type { Goal, Unit } from '@/db/types';

const GOALS: Goal[] = ['build_muscle', 'gain_strength', 'lose_fat', 'improve_endurance'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const setUnitStore = useSettings((s) => s.setUnit);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('build_muscle');
  const [unit, setUnit] = useState<Unit>('metric');
  const [saving, setSaving] = useState(false);

  const start = async () => {
    if (!name.trim()) {
      toast({ title: 'Add your name', description: 'So we can greet you on Home.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await completeOnboarding({ name: name.trim(), goal, unit });
      setUnitStore(unit);
      router.replace('/(app)/(tabs)');
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center py-8">
            <View className="mb-6 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary">
                <Dumbbell size={30} className="text-primary-foreground" />
              </View>
            </View>
            <Heading>Welcome to Incline</Heading>
            <Body className="mt-2 text-muted-foreground">
              Let’s set up your profile to personalize your training.
            </Body>

            <View className="mt-8 gap-2">
              <Caption>Your name</Caption>
              <Input value={name} onChangeText={setName} placeholder="e.g. Alex" autoCapitalize="words" />
            </View>

            <View className="mt-6 gap-2">
              <Caption>Primary goal</Caption>
              <View className="flex-row flex-wrap gap-2">
                {GOALS.map((g) => (
                  <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
                ))}
              </View>
            </View>

            <View className="mt-6 gap-2">
              <Caption>Units</Caption>
              <View className="flex-row gap-2">
                <Chip label="Metric (kg)" selected={unit === 'metric'} onPress={() => setUnit('metric')} />
                <Chip label="Imperial (lb)" selected={unit === 'imperial'} onPress={() => setUnit('imperial')} />
              </View>
            </View>
          </View>

          <Button size="lg" className="mt-4" onPress={start} disabled={saving}>
            {saving ? 'Saving…' : 'Get started'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
