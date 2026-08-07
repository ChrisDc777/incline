import { View } from 'react-native';

import { Body, Caption } from '@/components/common/text';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { AchievementStatus } from '@/lib/achievements';

/** Compact badge tile for the profile wall — unlocked vs locked, no flash. */
export function AchievementTile({
  achievement,
  className,
}: {
  achievement: AchievementStatus;
  className?: string;
}) {
  const { unlocked, title, description, progress, current, target } = achievement;
  return (
    <View
      className={cn(
        'min-w-[46%] flex-1 rounded-3xl border p-4',
        unlocked ? 'border-primary/25 bg-primary/5' : 'border-border bg-card',
        className,
      )}>
      <View className="flex-row items-start justify-between gap-2">
        <Body className={cn('flex-1 text-sm font-semibold', unlocked ? 'text-foreground' : 'text-muted-foreground')}>
          {title}
        </Body>
        <Badge variant={unlocked ? 'default' : 'neutral'}>{unlocked ? 'Done' : `${Math.round(progress * 100)}%`}</Badge>
      </View>
      <Caption className="mt-1.5" numberOfLines={2}>
        {description}
      </Caption>
      {!unlocked ? (
        <Caption className="mt-2">
          {current}/{target}
        </Caption>
      ) : null}
    </View>
  );
}
