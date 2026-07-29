import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings as SettingsIcon, Pencil, ChevronRight, Trash2, Info, Dumbbell, Flame, Layers } from 'lucide-react-native';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/common/chip';
import { StatCard } from '@/components/common/stat-card';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { useProfile, useProgressStats } from '@/hooks/use-data';
import { useSettings } from '@/store/settings-store';
import { useToast } from '@/components/ui/toast';
import { saveProfile, clearWorkoutHistory } from '@/db/queries';
import { GOAL_LABELS } from '@/lib/labels';
import { formatVolume } from '@/db/calc';
import type { Goal } from '@/db/types';

const GOALS: Goal[] = ['build_muscle', 'gain_strength', 'lose_fat', 'improve_endurance'];

export default function ProfileScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { unit } = useSettings();
  const { data: profile, refetch } = useProfile();
  const { data: stats, refetch: refetchStats } = useProgressStats();

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

  const clearHistory = async () => {
    setClearOpen(false);
    await clearWorkoutHistory();
    refetchStats();
    toast({ title: 'Workout history cleared', variant: 'info' });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Heading>Profile</Heading>

        <Card className="mt-4 items-center">
          <InitialsAvatar name={profile?.name ?? ''} size={72} />
          <Body className="mt-3 text-center font-semibold text-foreground">
            {profile?.name?.trim() || 'Athlete'}
          </Body>
          {profile?.goal ? (
            <Badge variant="default" className="mt-2">
              {GOAL_LABELS[profile.goal]}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" className="mt-4" leftIcon={<Pencil size={14} className="text-primary" />} onPress={openEdit}>
            Edit profile
          </Button>
        </Card>

        <View className="mt-6 flex-row gap-3">
          <StatCard label="Sessions" value={stats?.totalSessions ?? 0} icon={<Dumbbell size={16} className="text-primary" />} />
          <StatCard label="Volume" value={formatVolume(stats?.totalVolume ?? 0, unit)} icon={<Layers size={16} className="text-info" />} />
          <StatCard label="Streak" value={`${stats?.streak ?? 0}w`} icon={<Flame size={16} className="text-warning" />} />
        </View>

        <View className="mt-6 gap-2">
          <Pressable onPress={() => router.push('/(app)/settings')} className="flex-row items-center gap-3 rounded-2xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <SettingsIcon size={20} className="text-primary" />
            <Body className="flex-1 font-medium text-foreground">Settings</Body>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Pressable>

          <Pressable onPress={() => setClearOpen(true)} className="flex-row items-center gap-3 rounded-2xl bg-card p-4" android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
            <Trash2 size={20} className="text-destructive" />
            <Body className="flex-1 font-medium text-foreground">Clear workout history</Body>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Pressable>

          <View className="flex-row items-center gap-3 rounded-2xl bg-card p-4">
            <Info size={20} className="text-muted-foreground" />
            <View className="flex-1">
              <Body className="font-medium text-foreground">About Incline</Body>
              <Caption>Version 1.0.0 · MVP</Caption>
            </View>
          </View>
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
