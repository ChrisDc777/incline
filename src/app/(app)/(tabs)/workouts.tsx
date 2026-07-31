import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, Plus } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading } from '@/components/common/text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/common/segmented-control';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ListSkeleton } from '@/components/common/skeleton';
import { WorkoutCard } from '@/components/workout/workout-card';
import { ProgramCard } from '@/components/workout/program-card';
import { useTemplateSummaries, usePrograms } from '@/hooks/use-data';

type Tab = 'templates' | 'programs';

export default function WorkoutsScreen() {
  const [tab, setTab] = useState<Tab>('templates');
  const router = useRouter();
  const templates = useTemplateSummaries();
  const programs = usePrograms();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Heading>Workouts</Heading>
        <SegmentedControl<Tab>
          className="mt-3"
          value={tab}
          onChange={setTab}
          values={[
            { value: 'templates', label: 'Templates' },
            { value: 'programs', label: 'Programs' },
          ]}
        />
      </View>

      {tab === 'templates' ? (
        <FlashList
          data={templates.data ?? []}
          renderItem={({ item }) => (
            <WorkoutCard
              id={item.template.id}
              name={item.template.name}
              description={item.template.description}
              difficulty={item.template.difficulty}
              estimatedMinutes={item.template.estimatedMinutes}
              exerciseCount={item.exerciseCount}
              muscleFocus={item.muscleFocus}
            />
          )}
          keyExtractor={(item) => String(item.template.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <Button variant="outline" className="mb-3" leftIcon={<Icon icon={Plus} size={16} color="primary" />} onPress={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })}>
              Create template
            </Button>
          }
          ListEmptyComponent={
            templates.loading ? (
              <ListSkeleton count={3} />
            ) : templates.error ? (
              <ErrorState onRetry={templates.refetch} />
            ) : (
              <EmptyState icon={<Icon icon={Dumbbell} size={28} color="muted-foreground" />} title="No templates yet" description="Create your first workout template." actionLabel="Create" onAction={() => router.push({ pathname: '/(app)/template/[id]' as any, params: { id: 'new' } })} />
            )
          }
        />
      ) : null}

      {tab === 'programs' ? (
        <FlashList
          data={programs.data ?? []}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/(app)/program/[id]' as any, params: { id: String(item.id) } })}>
              <ProgramCard program={item} />
            </Pressable>
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            programs.loading ? <ListSkeleton count={2} /> : <EmptyState title="No programs yet" description="Training programs will appear here." />
          }
        />
      ) : null}
    </SafeAreaView>
  );
}
