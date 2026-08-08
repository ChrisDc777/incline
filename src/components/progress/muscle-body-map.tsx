import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Body from 'react-native-body-highlighter';

import { Caption } from '@/components/common/text';
import { cn } from '@/lib/cn';
import { useThemeHex } from '@/lib/theme';
import {
  bodyPartsForMuscles,
  bodyPartsFromMuscleCounts,
  type BodyHighlightPart,
} from '@/lib/muscle-body-map';
import type { MuscleDistribution, MuscleGroup } from '@/db/types';

type Side = 'front' | 'back';

/** Reusable SVG body map — distribution counts or explicit muscle list. */
export function MuscleBodyMap({
  distribution,
  muscles,
  scale = 1,
  compact = false,
  showToggle = true,
  className,
}: {
  distribution?: MuscleDistribution[];
  muscles?: MuscleGroup[];
  scale?: number;
  /** Smaller chrome for cards / share / session. */
  compact?: boolean;
  showToggle?: boolean;
  className?: string;
}) {
  const colors = useThemeHex();
  const [side, setSide] = useState<Side>('front');

  const data = useMemo(() => {
    let parts: BodyHighlightPart[] = [];
    if (distribution && distribution.length > 0) {
      const counts: Partial<Record<MuscleGroup, number>> = {};
      for (const d of distribution) counts[d.muscle] = d.sets;
      parts = bodyPartsFromMuscleCounts(counts);
    } else if (muscles && muscles.length > 0) {
      parts = bodyPartsForMuscles(muscles);
    }
    return parts.map((p) => ({ slug: p.slug, intensity: p.intensity }));
  }, [distribution, muscles]);

  const resolvedScale = compact ? Math.min(scale, 0.72) : scale;
  const toggle = showToggle && !compact;

  return (
    <View className={cn('items-center', className)}>
      {toggle ? (
        <View className="mb-3 flex-row gap-2">
          {(['front', 'back'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSide(s)}
              className={cn(
                'rounded-full px-3 py-1.5',
                side === s ? 'bg-primary/15' : 'bg-muted',
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: side === s }}>
              <Caption className={side === s ? 'font-semibold text-primary' : undefined}>
                {s === 'front' ? 'Front' : 'Back'}
              </Caption>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Body
        data={data}
        side={side}
        gender="male"
        scale={resolvedScale}
        border={colors.border}
        defaultFill={colors.muted}
        colors={[colors.primary, colors.primary]}
      />
      {data.length === 0 ? (
        <Caption className="mt-2">No muscle data yet</Caption>
      ) : null}
    </View>
  );
}
