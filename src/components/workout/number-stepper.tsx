import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { clamp } from '@/db/calc';

/**
 * Stepper for weight/reps with tap-to-edit direct entry. Controlled; commits on
 * blur/submit so the value is always a clean number.
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

  const display = value <= 0 ? '—' : decimals > 0 ? String(value) : String(value);

  return (
    <View className={cn('flex-row items-center', className)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className="h-9 w-9 items-center justify-center rounded-full bg-muted"
        onPress={() => onChange(clamp(value - step, min, max))}>
        <Minus size={16} className="text-foreground" />
      </Pressable>

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
          className="h-9 w-16 text-center text-base font-semibold text-foreground"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          className="h-9 w-16 items-center justify-center"
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className="h-9 w-9 items-center justify-center rounded-full bg-muted"
        onPress={() => onChange(clamp(value + step, min, max))}>
        <Plus size={16} className="text-foreground" />
      </Pressable>
    </View>
  );
}
