import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

/** Base text primitive. Semantic text components live in components/common/text. */
export function Text({ className, ...props }: TextProps) {
  return <RNText className={cn('font-sans text-base text-foreground', className)} {...props} />;
}
