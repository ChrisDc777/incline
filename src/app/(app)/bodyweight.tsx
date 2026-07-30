import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { Icon } from '@/components/common/icon';

import { Heading, Body, Caption } from '@/components/common/text';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useHaptics } from '@/hooks/use-haptics';
import { addBodyweightEntry, getBodyweightEntries, deleteBodyweightEntry } from '@/db/queries';
import { useSettings } from '@/store/settings-store';

interface Entry {
  id: number;
  weight: number;
  unit: string;
  recordedAt: number;
}

/** Simple dot-based line chart — no external chart library needed. */
function MiniChart({ data, unit }: { data: Entry[]; unit: string }) {
  if (data.length < 2) return null;

  const weights = data.map((e) => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const chartHeight = 120;
  const barWidth = Math.max(4, Math.min(20, 300 / data.length));

  return (
    <View className="mt-3 rounded-xl bg-card p-4">
      <View className="flex-row items-end justify-between" style={{ height: chartHeight }}>
        {data.slice(0, 30).reverse().map((entry, i) => {
          const height = ((entry.weight - min) / range) * (chartHeight - 20) + 10;
          const isLast = i === 0;
          return (
            <View key={entry.id} className="items-center" style={{ width: barWidth + 4 }}>
              <View
                style={{
                  width: barWidth,
                  height,
                  backgroundColor: isLast ? '#25ca62' : '#25ca6250',
                  borderRadius: barWidth / 2,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-2 flex-row justify-between">
        <Caption>{min.toFixed(1)} {unit}</Caption>
        <Caption>{max.toFixed(1)} {unit}</Caption>
      </View>
    </View>
  );
}

export default function BodyweightScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { impact } = useHaptics();
  const { unit } = useSettings();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const data = await getBodyweightEntries(90);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = entries[0]?.weight ?? null;
  const previous = entries[1]?.weight ?? null;
  const diff = latest !== null && previous !== null ? latest - previous : null;

  const addEntry = async () => {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(w) || w <= 0) {
      toast({ title: 'Enter a valid weight', variant: 'warning' });
      return;
    }
    await addBodyweightEntry(w, unit === 'metric' ? 'kg' : 'lb');
    impact();
    setAddOpen(false);
    setWeightInput('');
    toast({ title: 'Weight logged', variant: 'success' });
    load();
  };

  const removeEntry = async () => {
    if (deleteId === null) return;
    await deleteBodyweightEntry(deleteId);
    impact();
    setDeleteId(null);
    toast({ title: 'Entry deleted', variant: 'info' });
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between">
          <Heading>Bodyweight</Heading>
          <Button size="sm" variant="outline" leftIcon={<Icon icon={Plus} size={14} color="primary" />} onPress={() => setAddOpen(true)}>
            Log
          </Button>
        </View>

        {latest !== null && (
          <Card className="mt-4 p-4">
            <View className="flex-row items-center gap-4">
              <View>
                <Caption>Current</Caption>
                <Body className="text-2xl font-bold text-foreground">{latest.toFixed(1)} {unit === 'metric' ? 'kg' : 'lb'}</Body>
              </View>
              {diff !== null && (
                <View className="items-center">
                  <Icon
                    icon={diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus}
                    size={20}
                    color={diff > 0 ? 'warning' : diff < 0 ? 'success' : 'muted-foreground'}
                  />
                  <Caption className={diff > 0 ? 'text-warning' : diff < 0 ? 'text-success' : ''}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                  </Caption>
                </View>
              )}
            </View>
          </Card>
        )}

        <MiniChart data={entries} unit={unit === 'metric' ? 'kg' : 'lb'} />

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          {entries.length === 0 ? (
            <View className="items-center py-8">
              <Caption>No entries yet. Tap Log to record your weight.</Caption>
            </View>
          ) : (
            <View className="gap-1">
              {entries.map((e) => (
                <Pressable
                  key={e.id}
                  onLongPress={() => setDeleteId(e.id)}
                  className="flex-row items-center justify-between rounded-lg px-1 py-2"
                >
                  <View>
                    <Body className="text-sm font-medium text-foreground">{e.weight.toFixed(1)} {e.unit}</Body>
                    <Caption>{new Date(e.recordedAt).toLocaleDateString()}</Caption>
                  </View>
                  <Caption className="text-muted-foreground">Long press to delete</Caption>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Log bodyweight"
        footer={
          <>
            <Button variant="outline" onPress={() => setAddOpen(false)}>Cancel</Button>
            <Button onPress={addEntry}>Save</Button>
          </>
        }>
        <View className="gap-3 py-2">
          <Input
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={unit === 'metric' ? 'e.g. 75.5' : 'e.g. 166.4'}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Caption>{unit === 'metric' ? 'Kilograms' : 'Pounds'}</Caption>
        </View>
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete entry?"
        description="This cannot be undone."
        footer={
          <>
            <Button variant="outline" onPress={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onPress={removeEntry}>Delete</Button>
          </>
        }
      />
    </SafeAreaView>
  );
}
