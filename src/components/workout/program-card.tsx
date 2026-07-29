import { View } from 'react-native';
import { CalendarDays, Layers } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Icon } from '@/components/common/icon';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Body, Caption } from '@/components/common/text';
import type { Program } from '@/db/types';

/** Program card that navigates to the program detail screen. */
export function ProgramCard({ program }: { program: Program }) {
  const router = useRouter();
  const daysPerWeek = program.workouts && program.weeks
    ? Math.ceil(program.workouts.length / program.weeks)
    : 0;
  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">{program.name}</Text>
      <Body className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
        {program.description}
      </Body>
      <View className="mt-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Icon icon={CalendarDays} size={14} color="muted-foreground" />
          <Caption>{program.weeks} weeks</Caption>
        </View>
        <Caption>· {daysPerWeek} days / week</Caption>
        <Caption>· {program.workouts?.length ?? 0} workouts</Caption>
      </View>
    </Card>
  );
}
