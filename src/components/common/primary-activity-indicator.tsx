import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

import { usePrimaryHex } from '@/lib/theme';

/** ActivityIndicator tinted with the app primary token (respects theme preference). */
export function PrimaryActivityIndicator(props: Omit<ActivityIndicatorProps, 'color'>) {
  const color = usePrimaryHex();
  return <ActivityIndicator color={color} {...props} />;
}
