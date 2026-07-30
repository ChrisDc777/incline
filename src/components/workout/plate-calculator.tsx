import * as React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Dumbbell } from 'lucide-react-native';

import { Heading, Body, Caption } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/common/icon';
import { calculatePlates, type Plate } from '@/lib/plate-calculator';
import { useSettings } from '@/store/settings-store';
import { cn } from '@/lib/cn';

interface PlateCalculatorProps {
  /** Target total weight on the bar */
  targetWeight?: number;
  className?: string;
}

export function PlateCalculator({ targetWeight: initialTarget, className }: PlateCalculatorProps) {
  const settingsUnit = useSettings((s) => s.unit);
  const unit = settingsUnit === 'metric' ? 'kg' : 'lb';
  const [input, setInput] = React.useState(initialTarget?.toString() ?? '');
  const result = calculatePlates(Number(input) || 0, unit);

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <View className="mb-3 flex-row items-center gap-2">
        <Icon icon={Dumbbell} color="primary" size={20} />
        <Heading>Plate Calculator</Heading>
      </View>

      <View className="gap-3">
        <View className="gap-1.5">
          <Caption>Target weight ({unit})</Caption>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`e.g. ${unit === 'kg' ? '80' : '135'}`}
            placeholderTextColor="#6b7280"
            keyboardType="decimal-pad"
            className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
          />
        </View>

        {input && Number(input) > 0 && result && (
          <View className="gap-2">
            <Caption className="text-muted-foreground">
              {result.barbell}{unit} bar + {result.totalPerSide.toFixed(1)}{unit} per side
            </Caption>
            {result.plates.length === 0 ? (
              <Caption className="text-primary">Bar only — no plates needed</Caption>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {result.plates.map((plate) => (
                  <PlateChip key={plate.weight} plate={plate} unit={unit} />
                ))}
              </View>
            )}
          </View>
        )}

        {input && Number(input) > 0 && !result && (
          <Caption className="text-destructive">
            Weight must be at least the barbell ({unit === 'kg' ? '20' : '45'}{unit})
          </Caption>
        )}
      </View>
    </View>
  );
}

function PlateChip({ plate, unit }: { plate: Plate; unit: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5">
      <View className="h-2 w-2 rounded-full bg-primary" />
      <Body className="text-sm font-semibold text-primary">
        {plate.count}x {plate.weight}{unit}
      </Body>
    </View>
  );
}
