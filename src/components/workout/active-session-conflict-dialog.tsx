import { View } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onStartNew: () => void;
  onCancel?: () => void;
};

/** Shared "active session conflict" dialog when starting a new workout. */
export function ActiveSessionConflictDialog({
  open,
  onOpenChange,
  onResume,
  onStartNew,
  onCancel,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="You have a workout in progress"
      description="If you start a new workout, your old workout will be permanently deleted."
      footer={
        <View className="w-full gap-2">
          <Button onPress={onResume}>Resume workout in progress</Button>
          <Button variant="destructive" onPress={onStartNew}>
            Start new workout
          </Button>
          <Button
            variant="outline"
            onPress={() => {
              onOpenChange(false);
              onCancel?.();
            }}>
            Cancel
          </Button>
        </View>
      }
    />
  );
}
