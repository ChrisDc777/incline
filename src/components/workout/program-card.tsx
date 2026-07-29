import { View } from 'react-native';
import { CalendarDays, Layers } from 'lucide-react-native';

import { Icon } from '@/components/common/icon';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Body, Caption } from '@/components/common/text';
import type { Program } from '@/db/types';

/** Informational program card. A dedicated program builder is on the roadmap. */
export function ProgramCard({ program }: { program: Program }) {
  const daysPerWeek = program.workouts && program.weeks
    ? Math.ceil(program.workouts.length / program.weeks)
    : 0;
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{program.name}</Text>
          <Body className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
            {program.description}
          </Body>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
          <Icon icon={Layers} size={18} color="primary" />
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Icon icon={CalendarDays} size={14} color="muted-foreground" />
          <Caption>{program.weeks} weeks</Caption>
        </View>
        <Caption>· {daysPerWeek} days / week</Caption>
      </View>
    </Card>
  );
}
