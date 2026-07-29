import { Pressable, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search exercises',
  className,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <View className={cn('relative', className)}>
      <View className="absolute left-3.5 top-0 h-full items-center justify-center">
        <Search size={18} className="text-muted-foreground" />
      </View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="pl-10 pr-10"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          className="absolute right-3 top-0 h-full items-center justify-center"
          onPress={() => onChangeText('')}>
          <X size={18} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
