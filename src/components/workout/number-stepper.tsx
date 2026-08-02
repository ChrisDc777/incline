import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/text';
import { clamp } from '@/db/calc';

export interface NumberStepperHandle {
  /** Enter edit mode and focus the input. */
  focus: () => void;
}

/**
 * Clean inline-editable number field. Tap the value to type a new number;
 * commits on blur/submit. No +/- buttons. When `onSubmitNext` is provided the
 * return key acts as "next" (Android), letting users flow from field to field.
 */
export function NumberStepper({
  ref,
  value,
  onChange,
  step = 2.5,
  min = 0,
  max = 1000,
  suffix,
  decimals = 0,
  onSubmitNext,
  className,
}: {
  ref?: Ref<NumberStepperHandle>;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimals?: number;
  onSubmitNext?: () => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<TextInput>(null);
  const committedRef = useRef(false);

  useImperativeHandle(ref, () => ({ focus: () => setEditing(true) }), []);

  useEffect(() => {
    if (!editing) setDraft(value === 0 && decimals === 0 ? '' : String(value));
  }, [value, editing, decimals]);

  // Focus after the TextInput has been laid out so the keyboard doesn't cause
  // the surrounding ScrollView to re-flow / jump on Android.
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [editing]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
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
          value={draft}
          onChangeText={(t) => { committedRef.current = false; setDraft(t); }}
          onBlur={commit}
          onSubmitEditing={() => { commit(); onSubmitNext?.(); }}
          keyboardType="decimal-pad"
          returnKeyType={onSubmitNext ? 'next' : 'done'}
          style={{ includeFontPadding: false }}
          className="h-9 min-w-[60px] rounded-lg bg-muted/60 px-2 text-center text-base font-semibold text-foreground"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit value: ${display}${suffix ? ` ${suffix}` : ''}`}
          className="h-9 min-w-[60px] items-center justify-center rounded-lg bg-muted/60 px-2"
          onPress={() => {
            committedRef.current = false;
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
