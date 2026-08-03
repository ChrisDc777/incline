import { Pressable, View } from 'react-native';
import { Clock, Dumbbell, MoreHorizontal, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import type { Difficulty, MuscleGroup } from '@/db/types';

/**
 * Routine card used on the Workouts library. Tapping the body navigates to the
 * routine detail; when `onStart`/`onMenuPress` are provided, a "Start Routine"
 * button and a three-dot menu are rendered.
 */
export function WorkoutCard({
  id,
  name,
  description,
  difficulty,
  estimatedMinutes,
  exerciseCount,
  muscleFocus,
  onStart,
  onMenuPress,
  className,
}: {
  id: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  exerciseCount: number;
  muscleFocus: MuscleGroup[];
  onStart?: () => void;
  onMenuPress?: () => void;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Card className={cn(className)}>
      <Pressable onPress={() => router.push(`/workout/${id}`)} android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{name}</Text>
            <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
              {description}
            </Text>
          </View>
          {onMenuPress ? (
            <Pressable onPress={onMenuPress} hitSlop={8} className="rounded-lg p-1">
              <Icon icon={MoreHorizontal} size={20} color="muted-foreground" />
            </Pressable>
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-3xl bg-primary/15">
              <Icon icon={Dumbbell} size={18} color="primary" />
            </View>
          )}
        </View>

        <View className="mt-3 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <Icon icon={Dumbbell} size={14} color="muted-foreground" />
            <Text className="text-xs text-muted-foreground">{exerciseCount} exercises</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon icon={Clock} size={14} color="muted-foreground" />
            <Text className="text-xs text-muted-foreground">{estimatedMinutes} min</Text>
          </View>
          <Text className="text-xs text-muted-foreground">· {DIFFICULTY_LABELS[difficulty]}</Text>
        </View>
      </Pressable>

      {onStart ? (
        <Button
          className="mt-3"
          size="sm"
          leftIcon={<Icon icon={Play} size={14} color="primary-foreground" />}
          onPress={onStart}>
          Start Routine
        </Button>
      ) : null}
    </Card>
  );
}
