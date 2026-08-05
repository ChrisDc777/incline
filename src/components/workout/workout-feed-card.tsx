import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Weight, Medal } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Text } from '@/components/ui/text';
import { Caption, Body } from '@/components/common/text';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { ExerciseThumb } from '@/components/exercise/exercise-media';
import { formatDuration, formatVolume, relativeTime } from '@/db/calc';
import type { FeedWorkoutLog, Unit } from '@/db/types';

const MAX_VISIBLE_EXERCISES = 3;

/** A single completed workout in the home feed. */
export function WorkoutFeedCard({
  log,
  unit,
  profileName,
  avatarUrl,
  className,
}: {
  log: FeedWorkoutLog;
  unit: Unit;
  profileName: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const visibleExercises = expanded
    ? log.exercises
    : log.exercises.slice(0, MAX_VISIBLE_EXERCISES);
  const hiddenCount = log.exercises.length - MAX_VISIBLE_EXERCISES;

  return (
    <Pressable
      onPress={() => router.push(`/summary/${log.id}`)}
      style={({ pressed }) => (pressed ? { opacity: 0.75 } : undefined)}
      className={`bg-card p-4 ${className ?? ''}`}>
      {/* Header: avatar + name + time */}
      <View className="flex-row items-center gap-3">
        <InitialsAvatar name={profileName} uri={avatarUrl} size={44} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{profileName}</Text>
          <Caption>{relativeTime(log.startedAt)}</Caption>
        </View>
      </View>

      {/* Workout name */}
      <Body className="mt-3 text-lg font-bold text-foreground">{log.name}</Body>

      {/* Stats row */}
      <View className="mt-2 flex-row gap-5">
        <View className="flex-row items-center gap-1.5">
          <Icon icon={Clock} size={14} color="muted-foreground" />
          <Caption>{formatDuration(log.durationSeconds)}</Caption>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon icon={Weight} size={14} color="muted-foreground" />
          <Caption>{formatVolume(log.totalVolume, unit)}</Caption>
        </View>
        {log.prCount > 0 ? (
          <View className="flex-row items-center gap-1.5">
            <Icon icon={Medal} size={14} color="warning" />
            <Caption>{log.prCount}</Caption>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View className="my-3 h-px bg-border/40" />

      {/* Exercise list */}
      <View className="gap-3">
        {visibleExercises.map((ex) => (
          <Pressable
            key={ex.exerciseId}
            onPress={() => router.push(`/exercise/${ex.exerciseId}`)}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
            className="flex-row items-center gap-3"
            accessibilityRole="button"
            accessibilityLabel={`Open ${ex.exerciseName} details`}>
            <ExerciseThumb uri={ex.imageUrl} />
            <Body className="flex-1 text-sm text-foreground">
              {ex.setCount} set{ex.setCount !== 1 ? 's' : ''} {ex.exerciseName}
            </Body>
          </Pressable>
        ))}
      </View>

      {/* See more */}
      {!expanded && hiddenCount > 0 ? (
        <Pressable
          onPress={() => setExpanded(true)}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
          className="mt-3 items-center py-1">
          <Caption className="text-primary">See {hiddenCount} more exercise{hiddenCount !== 1 ? 's' : ''}</Caption>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
