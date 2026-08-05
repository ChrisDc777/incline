import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dumbbell, Pause, Play } from 'lucide-react-native';

import { Icon } from '@/components/common/icon';
import { cn } from '@/lib/cn';
import { hexToRgba, useThemeHex } from '@/lib/theme';
import { useAppColorScheme } from '@/lib/use-color-scheme';

/**
 * Dark-framed exercise artwork with a soft vignette so white ExerciseDB GIFs
 * sit inside the theme instead of blowing out the screen.
 */
export function ExerciseMedia({
  uri,
  height = 200,
  className,
  showPause = true,
}: {
  uri?: string | null;
  height?: number;
  className?: string;
  showPause?: boolean;
}) {
  const colors = useThemeHex();
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const imageRef = useRef<Image>(null);
  const [paused, setPaused] = useState(false);

  if (!uri) {
    return (
      <View className={cn('mb-4 items-center justify-center rounded-2xl border border-border bg-surface2 py-10', className)}>
        <Icon icon={Dumbbell} size={40} color="muted-foreground" />
      </View>
    );
  }

  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    try {
      if (next) await imageRef.current?.stopAnimating();
      else await imageRef.current?.startAnimating();
    } catch {
      // Native animation controls are best-effort on some platforms.
    }
  };

  return (
    <View className={cn('mb-4 overflow-hidden rounded-2xl border border-border bg-surface2 p-2', className)}>
      <View className="overflow-hidden rounded-xl" style={{ height }}>
        <Image
          ref={imageRef}
          source={{ uri }}
          style={{ width: '100%', height }}
          contentFit="contain"
          autoplay
          accessibilityLabel="Exercise demonstration"
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'transparent',
            hexToRgba(colors.surface2, isDark ? 0.55 : 0.35),
          ]}
          locations={[0.55, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {showPause ? (
          <Pressable
            onPress={togglePause}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Play demonstration' : 'Pause demonstration'}
            className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full bg-black/50">
            <Icon icon={paused ? Play : Pause} size={16} color="white" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Circular thumb for feed / summary / edit rows. */
export function ExerciseThumb({
  uri,
  size = 44,
  className,
}: {
  uri?: string | null;
  size?: number;
  className?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={cn('bg-muted', className)}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      className={cn('items-center justify-center rounded-full bg-muted', className)}
      style={{ width: size, height: size }}>
      <Icon icon={Dumbbell} size={Math.round(size * 0.4)} color="muted-foreground" />
    </View>
  );
}
