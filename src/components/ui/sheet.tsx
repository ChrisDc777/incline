import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from './text';

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal transparent animationType="slide" visible={open} onRequestClose={() => onOpenChange(false)}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={() => onOpenChange(false)}>
        <Pressable className="rounded-t-3xl bg-card p-5 pb-10" onPress={(e) => e.stopPropagation()}>
          <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />
          {title ? <Text className="mb-3 text-lg font-semibold text-foreground">{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
