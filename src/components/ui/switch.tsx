import { Switch as NativeSwitch } from 'react-native';

import { useThemeHex } from '@/lib/theme';
import { useAppColorScheme } from '@/lib/use-color-scheme';

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
  const scheme = useAppColorScheme();
  const colors = useThemeHex();
  return (
    <NativeSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        true: colors.primary,
        false: scheme === 'dark' ? '#27272a' : colors.muted,
      }}
      thumbColor="#ffffff"
    />
  );
}
