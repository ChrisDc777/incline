import { View } from 'react-native';
import { useColorScheme } from 'react-native';
import ExpoSegmentedControl from '@expo/ui/community/segmented-control';

import { cn } from '@/lib/cn';

/** Brand accent used for native controls that can't read CSS variables. */
const BRAND_HEX = '#25ca62';

/**
 * Segmented control adapter over @expo/ui's native SegmentedControl
 * (SwiftUI Picker on iOS, Jetpack Compose on Android, vaul on web) for a
 * genuinely native feel. Keeps a value/onChange API for ergonomics.
 */
export function SegmentedControl<T extends string>({
  values,
  value,
  onChange,
  className,
}: {
  values: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const scheme = useColorScheme();
  const selectedIndex = Math.max(0, values.findIndex((v) => v.value === value));
  return (
    <View className={cn(className)}>
      <ExpoSegmentedControl
        values={values.map((v) => v.label)}
        selectedIndex={selectedIndex}
        tintColor={BRAND_HEX}
        appearance={scheme === 'dark' ? 'dark' : 'light'}
        onValueChange={(label: string) => {
          const found = values.find((v) => v.label === label);
          if (found) onChange(found.value);
        }}
      />
    </View>
  );
}
