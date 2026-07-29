import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { clamp } from '@/db/calc';

/**
 * Clean inline-editable number field. Tap the value to type a new number;
 * commits on blur/submit. No +/- buttons.
 */
export function NumberStepper({
  value,
  onChange,
  step = 2.5,
  min = 0,
  max = 1000,
  suffix,
  decimals = 0,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!editing) setDraft(value === 0 && decimals === 0 ? '' : String(value));
  }, [value, editing, decimals]);

  const commit = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : min;
    onChange(decimals > 0 ? Math.round(next * 10) / 10 : Math.round(next));
    setEditing(false);
  };

  const display = value <= 0 ? '—' : String(value);

  return (
    <View className={cn('flex-row items-center', className)}>
      {editing ? (
        <TextInput
          ref={inputRef}
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          className="h-9 min-w-[60px] rounded-lg bg-muted/60 px-2 text-center text-base font-semibold text-foreground"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit value: ${display}${suffix ? ` ${suffix}` : ''}`}
          className="h-9 min-w-[60px] items-center justify-center rounded-lg bg-muted/60 px-2"
          onPress={() => {
            setDraft(value > 0 ? String(value) : '');
            setEditing(true);
          }}>
          <Text className="text-base font-semibold text-foreground">
            {display}
            {suffix ? <Text className="text-xs text-muted-foreground"> {suffix}</Text> : null}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
