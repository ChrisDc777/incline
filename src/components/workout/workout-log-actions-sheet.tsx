import { Pressable, View } from 'react-native';
import { BookmarkPlus, Pencil, Trash2 } from 'lucide-react-native';

import { Icon } from '@/components/common/icon';
import { Body } from '@/components/common/text';
import { Sheet } from '@/components/ui/sheet';

/** Overflow actions for a completed workout (⋯). Share lives as its own icon. */
export function WorkoutLogActionsSheet({
  open,
  onOpenChange,
  title,
  canSaveAsRoutine = true,
  onEdit,
  onSaveAsRoutine,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  canSaveAsRoutine?: boolean;
  onEdit: () => void;
  onSaveAsRoutine: () => void;
  onDelete: () => void;
}) {
  const run = (fn: () => void) => {
    onOpenChange(false);
    requestAnimationFrame(fn);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} mode="fit">
      <View className="gap-1">
        <Pressable
          onPress={() => run(onEdit)}
          className="flex-row items-center gap-3 rounded-xl p-3"
          android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
          accessibilityRole="button"
          accessibilityLabel="Edit workout">
          <Icon icon={Pencil} size={18} color="muted-foreground" />
          <Body className="text-foreground">Edit workout</Body>
        </Pressable>
        <Pressable
          onPress={() => {
            if (!canSaveAsRoutine) return;
            run(onSaveAsRoutine);
          }}
          disabled={!canSaveAsRoutine}
          className="flex-row items-center gap-3 rounded-xl p-3"
          style={!canSaveAsRoutine ? { opacity: 0.45 } : undefined}
          android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
          accessibilityRole="button"
          accessibilityLabel="Save as routine"
          accessibilityState={{ disabled: !canSaveAsRoutine }}>
          <Icon icon={BookmarkPlus} size={18} color="muted-foreground" />
          <Body className="text-foreground">Save as routine</Body>
        </Pressable>
        <Pressable
          onPress={() => run(onDelete)}
          className="flex-row items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3"
          android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
          accessibilityRole="button"
          accessibilityLabel="Delete workout">
          <Icon icon={Trash2} size={18} color="destructive" />
          <Body className="text-destructive">Delete workout</Body>
        </Pressable>
      </View>
    </Sheet>
  );
}
