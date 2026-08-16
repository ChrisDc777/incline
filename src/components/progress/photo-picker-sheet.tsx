import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';

import { Caption } from '@/components/common/text';
import { EmptyState } from '@/components/common/states';
import { Sheet } from '@/components/ui/sheet';
import { formatFullDate } from '@/db/calc';
import type { ProgressPhoto, WeekStartsOn } from '@/db/types';
import { groupProgressPhotosByWeek } from '@/lib/progress-photos';

const THUMB = 88;

export function PhotoPickerSheet({
  open,
  onOpenChange,
  title,
  photos,
  selectedId,
  weekStartsOn,
  onPick,
  onEndReached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  photos: ProgressPhoto[];
  selectedId: number | null;
  weekStartsOn: WeekStartsOn;
  onPick: (photo: ProgressPhoto) => void;
  onEndReached?: () => void;
}) {
  const groups = useMemo(
    () => groupProgressPhotosByWeek(photos, weekStartsOn),
    [photos, weekStartsOn],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} mode="expandable">
      <View style={{ minHeight: 320, maxHeight: 520 }}>
        {photos.length === 0 ? (
          <EmptyState title="No photos" description="Finish a workout and attach a gym pic on the summary." />
        ) : (
          <FlashList
            data={groups}
            keyExtractor={(item) => String(item.weekStartMs)}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <View className="mb-4">
                <Caption className="mb-2 font-medium text-foreground">{item.label}</Caption>
                <View className="flex-row flex-wrap gap-2">
                  {item.photos.map((photo) => {
                    const selected = photo.id === selectedId;
                    return (
                      <Pressable
                        key={photo.id}
                        onPress={() => onPick(photo)}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose photo from ${photo.workoutName} on ${formatFullDate(photo.startedAt)}`}
                        accessibilityState={{ selected }}
                        className={selected ? 'rounded-2xl border-2 border-primary p-0.5' : 'rounded-2xl p-0.5'}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={{ width: THUMB, height: THUMB, borderRadius: 14 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          recyclingKey={`progress-thumb-${photo.id}`}
                        />
                        <Caption className="mt-1 w-[88px]" numberOfLines={1}>
                          {photo.workoutName}
                        </Caption>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Sheet>
  );
}
