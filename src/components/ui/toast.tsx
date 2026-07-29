import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { Text } from './text';

type ToastVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const accent: Record<ToastVariant, string> = {
  default: '',
  success: 'border-l-2 border-l-success',
  warning: 'border-l-2 border-l-warning',
  destructive: 'border-l-2 border-l-destructive',
  info: 'border-l-2 border-l-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastContextValue['toast']>((t) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, title: t.title, description: t.description, variant: t.variant ?? 'default' }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View pointerEvents="none" className="absolute inset-x-0 top-0 z-50">
        <SafeAreaView edges={['top']} className="px-4">
          {toasts.map((t) => (
            <Pressable key={t.id} className={cn('mb-2 rounded-2xl border border-border bg-card p-4 shadow-md', accent[t.variant])}>
              <Text className="text-sm font-semibold text-foreground">{t.title}</Text>
              {t.description ? <Text className="mt-0.5 text-xs text-muted-foreground">{t.description}</Text> : null}
            </Pressable>
          ))}
        </SafeAreaView>
      </View>
    </ToastContext.Provider>
  );
}
