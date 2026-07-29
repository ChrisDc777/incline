import { Pressable, View } from 'react-native';
import { Clock, Dumbbell } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/common/icon';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import type { Difficulty, MuscleGroup } from '@/db/types';

/** Template card used on Home and the Workouts library. */
export function WorkoutCard({
  id,
  name,
  description,
  difficulty,
  estimatedMinutes,
  exerciseCount,
  muscleFocus,
  className,
}: {
  id: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  exerciseCount: number;
  muscleFocus: MuscleGroup[];
  className?: string;
}) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/workout/${id}`)} android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
      <Card className={cn(className)}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{name}</Text>
            <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
              {description}
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Icon icon={Dumbbell} size={18} color="primary" />
          </View>
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
      </Card>
    </Pressable>
  );
}
