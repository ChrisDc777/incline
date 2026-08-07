import { View } from 'react-native';
import { Host, Switch as ExpoSwitch } from '@expo/ui';

/**
 * Platform-native toggle via Expo UI (Material 3 Switch on Android, SwiftUI Toggle on iOS).
 * Matches the OS control size/shape better than React Native's Switch.
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
  return (
    <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="switch" accessibilityState={{ checked: value, disabled: !!disabled }}>
      <Host matchContents>
        <ExpoSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
      </Host>
    </View>
  );
}
