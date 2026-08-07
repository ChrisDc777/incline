import { useState } from 'react';
import { Pressable, ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { documentDirectory, makeDirectoryAsync, copyAsync } from 'expo-file-system/legacy';
import { Settings as SettingsIcon, Pencil, ChevronRight, Trash2, Info, Dumbbell, BarChart3, Ruler, Calendar, LogOut, Camera, Calculator, Weight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Chip } from '@/components/common/chip';
import { StatCard } from '@/components/common/stat-card';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { useProfile, useProgressStats } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { useToast } from '@/components/ui/toast';
import { saveProfile, clearWorkoutHistory } from '@/db/queries';
import { GOAL_LABELS } from '@/lib/labels';
import { formatVolume } from '@/db/calc';
import { SCREEN_CONTENT } from '@/lib/layout';
import { METRIC_ICONS } from '@/lib/metric-icons';
import { hexToRgba, usePrimaryHex } from '@/lib/theme';
import { evaluateAchievements } from '@/lib/achievements';
import { AchievementTile } from '@/components/profile/achievement-tile';
import type { Goal } from '@/db/types';

const GOALS: Goal[] = ['build_muscle', 'gain_strength', 'lose_fat', 'improve_endurance'];

export default function ProfileScreen() {
  const router = useRouter();
  const primary = usePrimaryHex();
  const { toast } = useToast();
  const { unit } = useSettings();
  const { data: profile, refetch } = useProfile();
  const { data: stats, refetch: refetchStats } = useProgressStats();
  const { signOut } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('build_muscle');
  const [bodyweight, setBodyweight] = useState('');

  const openEdit = () => {
    setName(profile?.name ?? '');
    setGoal(profile?.goal ?? 'build_muscle');
    setBodyweight(profile?.bodyweight ? String(profile.bodyweight) : '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const bw = bodyweight.trim() ? parseFloat(bodyweight.replace(',', '.')) : null;
    await saveProfile({ name: name.trim(), goal, bodyweight: Number.isFinite(bw) ? bw : null });
    setEditOpen(false);
    refetch();
    toast({ title: 'Profile updated', variant: 'success' });
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const dir = `${documentDirectory}avatars/`;
    await makeDirectoryAsync(dir, { intermediates: true });
    const filename = `avatar_${Date.now()}.jpg`;
    const localUri = `${dir}${filename}`;
    await copyAsync({ from: asset.uri, to: localUri });

    await saveProfile({ avatarUrl: localUri });
    refetch();
    toast({ title: 'Profile photo updated', variant: 'success' });
  };

  const clearHistory = async () => {
    setClearOpen(false);
    await clearWorkoutHistory();
    refetchStats();
    toast({ title: 'Workout history cleared', variant: 'info' });
  };

  const achievements = evaluateAchievements(stats);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={SCREEN_CONTENT}>
        <Heading>Profile</Heading>

        <View className="mt-4 overflow-hidden rounded-3xl">
          <LinearGradient
            colors={[hexToRgba(primary, 0.14), hexToRgba(primary, 0.02)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-4">
              <View className="flex-row items-start gap-4">
                <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo" className="relative">
                  <InitialsAvatar name={profile?.name ?? ''} uri={profile?.avatarUrl} size={80} />
                  <View className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Icon icon={Camera} size={12} color="primary-foreground" />
                  </View>
                </Pressable>
                <View className="flex-1 pt-1">
                  <Body className="text-lg font-bold text-foreground">
                    {profile?.name?.trim() || 'Athlete'}
                  </Body>
                  <Caption className="mt-0.5">
                    {profile?.goal ? GOAL_LABELS[profile.goal] : 'Set your goal'}
                  </Caption>
                </View>
              </View>
              <Button variant="outline" size="sm" className="mt-4" leftIcon={<Icon icon={Pencil} size={14} color="muted-foreground" />} onPress={openEdit}>
                Edit profile
              </Button>
            </View>
          </LinearGradient>
        </View>

        <View className="mt-6 flex-row gap-3">
          <StatCard label="Sessions" value={stats?.totalSessions ?? 0} icon={<Icon icon={METRIC_ICONS.sessions} size={16} color="muted-foreground" />} />
          <StatCard label="Volume" value={formatVolume(stats?.totalVolume ?? 0, unit)} icon={<Icon icon={METRIC_ICONS.volume} size={16} color="info" />} />
          <StatCard label="Sets" value={stats?.totalSets ?? 0} icon={<Icon icon={METRIC_ICONS.sets} size={16} color="muted-foreground" />} />
        </View>

        <View className="mt-6">
          <View className="mb-3 flex-row items-baseline justify-between">
            <Caption className="text-base font-semibold text-foreground">Milestones</Caption>
            <Caption>
              {unlockedCount}/{achievements.length}
            </Caption>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {achievements.map((a) => (
              <AchievementTile key={a.id} achievement={a} />
            ))}
          </View>
        </View>

        <Caption className="mb-3 mt-6">Dashboard</Caption>
        <View className="flex-row gap-3">
          <Pressable onPress={() => router.push('/(app)/(tabs)/progress')} accessibilityRole="button" accessibilityLabel="Statistics" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={BarChart3} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">Statistics</Body>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/exercises' as Href)} accessibilityRole="button" accessibilityLabel="Exercises" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Dumbbell} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">Exercises</Body>
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-3">
          <Pressable onPress={() => router.push('/(app)/bodyweight' as Href)} accessibilityRole="button" accessibilityLabel="Measurements" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Ruler} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">Measures</Body>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/calendar' as Href)} accessibilityRole="button" accessibilityLabel="Calendar" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Calendar} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">Calendar</Body>
          </Pressable>
        </View>

        <Caption className="mb-3 mt-6">Tools</Caption>
        <View className="flex-row gap-3">
          <Pressable onPress={() => router.push('/(app)/calculator' as Href)} accessibilityRole="button" accessibilityLabel="1RM calculator" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Calculator} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">1RM Calc</Body>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/plate-calculator' as Href)} accessibilityRole="button" accessibilityLabel="Plate calculator" className="flex-1 flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Weight} size={20} color="muted-foreground" />
            <Body className="font-medium text-foreground">Plates</Body>
          </Pressable>
        </View>

        <Caption className="mb-3 mt-6">Settings</Caption>
        <View className="gap-2">
          <Pressable onPress={() => router.push('/(app)/settings')} accessibilityRole="button" accessibilityLabel="Settings" className="flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={SettingsIcon} size={20} color="muted-foreground" />
            <Body className="flex-1 font-medium text-foreground">Settings</Body>
            <Icon icon={ChevronRight} size={18} color="muted-foreground" />
          </Pressable>

          <Pressable onPress={() => setClearOpen(true)} accessibilityRole="button" accessibilityLabel="Clear workout history" className="flex-row items-center gap-3 rounded-3xl border border-destructive/20 bg-destructive/10 p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={Trash2} size={20} color="destructive" />
            <Body className="flex-1 font-medium text-foreground">Clear workout history</Body>
            <Icon icon={ChevronRight} size={18} color="muted-foreground" />
          </Pressable>

          <View className="flex-row items-center gap-3 rounded-3xl bg-card p-4">
            <Icon icon={Info} size={20} color="muted-foreground" />
            <View className="flex-1">
              <Body className="font-medium text-foreground">About Incline</Body>
              <Caption>Version 1.0.0</Caption>
            </View>
          </View>

          {/* Dev tools — hidden in production */}
          {__DEV__ && (
            <View className="mt-4 gap-2 rounded-3xl border border-dashed border-border p-4">
              <Caption className="mb-1 font-semibold">Dev Tools</Caption>
              <Button variant="outline" size="sm" onPress={async () => {
                const { resetUserData } = await import('@/db/queries');
                await resetUserData();
                Alert.alert('Done', 'Logs, bodyweight, and profile cleared. Routines kept.');
                router.replace('/(onboarding)');
              }}>
                Clear Logs &amp; Reset Profile
              </Button>
            </View>
          )}

          <Pressable onPress={async () => { await signOut(); router.replace('/(auth)/sign-in' as Href); }} accessibilityRole="button" accessibilityLabel="Sign out" className="flex-row items-center gap-3 rounded-3xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Icon icon={LogOut} size={20} color="muted-foreground" />
            <Body className="flex-1 font-medium text-foreground">Sign out</Body>
          </Pressable>
        </View>
      </ScrollView>

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit profile"
        footer={
          <>
            <Button variant="outline" onPress={() => setEditOpen(false)}>Cancel</Button>
            <Button onPress={saveEdit}>Save</Button>
          </>
        }>
        <View className="gap-3">
          <View className="gap-1.5">
            <Caption>Name</Caption>
            <Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          </View>
          <View className="gap-1.5">
            <Caption>Goal</Caption>
            <View className="flex-row flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
              ))}
            </View>
          </View>
          <View className="gap-1.5">
            <Caption>Bodyweight ({unit === 'metric' ? 'kg' : 'lb'})</Caption>
            <Input value={bodyweight} onChangeText={setBodyweight} placeholder="Optional" keyboardType="decimal-pad" />
          </View>
        </View>
      </Dialog>

      <Dialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all history?"
        description="This permanently deletes every completed workout. This cannot be undone."
        footer={
          <>
            <Button variant="outline" onPress={() => setClearOpen(false)}>Cancel</Button>
            <Button variant="destructive" onPress={clearHistory}>Delete</Button>
          </>
        }
      />
    </SafeAreaView>
  );
}
