import { Pressable, View, ActivityIndicator } from 'react-native';
import { Dumbbell, Clock, Plus } from 'lucide-react-native';

import { Icon } from '@/components/common/icon';
import { Body, Caption } from '@/components/common/text';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { useTemplateSummaries } from '@/hooks/use-data';
import type { TemplateSummary } from '@/db/queries';

export function TemplatePickerSheet({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (templateId: number | null, name: string) => void;
}) {
  const templates = useTemplateSummaries();

  const start = (templateId: number | null, name: string) => {
    onOpenChange(false);
    onStart(templateId, name);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Start a workout" snapPoints={['55%', '85%']} scroll>
      {templates.loading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : (
        <Pressable
          onPress={() => start(null, 'Quick Workout')}
          className="mb-2 flex-row items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
          android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Icon icon={Plus} size={18} color="primary" />
          </View>
          <View className="flex-1">
            <Body className="font-semibold text-foreground">Quick Workout</Body>
            <Caption className="text-muted-foreground">Start with an empty workout</Caption>
          </View>
        </Pressable>
      )}

      <Caption className="mb-2 mt-4 font-semibold">Templates</Caption>
      {templates.data?.map((t) => (
        <TemplateRow key={t.template.id} summary={t} onPress={() => start(t.template.id, t.template.name)} />
      ))}
    </Sheet>
  );
}

function TemplateRow({ summary, onPress }: { summary: TemplateSummary; onPress: () => void }) {
  const t = summary.template;
  return (
    <Pressable
      onPress={onPress}
      className={cn('flex-row items-center gap-3 rounded-2xl border border-border/60 p-4')}
      android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
        <Icon icon={Dumbbell} size={18} color="primary" />
      </View>
      <View className="flex-1">
        <Body className="font-semibold text-foreground">{t.name}</Body>
        <Caption className="text-muted-foreground" numberOfLines={1}>
          {summary.exerciseCount} exercises · {t.estimatedMinutes} min
          {summary.muscleFocus.length > 0 ? ` · ${summary.muscleFocus.join(', ')}` : ''}
        </Caption>
      </View>
      <Icon icon={Clock} size={16} color="muted-foreground" />
    </Pressable>
  );
}
