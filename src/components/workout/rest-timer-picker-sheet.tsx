import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { REST_PRESETS } from '@/constants/rest-presets';
import { Settings } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

export function RestTimerPickerSheet({
  open,
  onOpenChange,
  currentValue,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: number;
  onSelect: (seconds: number) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Rest Timer">
      <View className="gap-2">
        {REST_PRESETS.map((p) => (
          <Pressable
            key={p.seconds}
            onPress={() => { onSelect(p.seconds); onOpenChange(false); }}
            className={cn(
              'flex-row items-center justify-center rounded-xl py-3.5',
              currentValue === p.seconds ? 'bg-primary' : 'bg-muted',
            )}>
            <Text className={cn('text-base font-medium', currentValue === p.seconds ? 'text-primary-foreground' : 'text-foreground')}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button variant="outline" className="mt-4" onPress={() => onOpenChange(false)}>
        Done
      </Button>
    </Sheet>
  );
}
