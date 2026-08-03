import { Switch as NativeSwitch } from 'react-native';

import { useAppColorScheme } from '@/lib/use-color-scheme';

const PRIMARY_LIGHT = '#16a34a';
const PRIMARY_DARK = '#22c55e';
const TRACK_OFF_LIGHT = '#e4e4e7';
const TRACK_OFF_DARK = '#27272a';

/**
 * Native platform switch. Immediate response, no custom animation —
 * delegates to the OS rendering for a snappy, native feel.
 */
export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const isDark = useAppColorScheme() === 'dark';
  return (
    <NativeSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        true: isDark ? PRIMARY_DARK : PRIMARY_LIGHT,
        false: isDark ? TRACK_OFF_DARK : TRACK_OFF_LIGHT,
      }}
      thumbColor="#ffffff"
    />
  );
}
