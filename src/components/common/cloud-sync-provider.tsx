import { useCloudSync } from '@/hooks/use-cloud-sync';

/** Mounts sync lifecycle (foreground push/pull) inside the signed-in app shell. */
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useCloudSync();
  return <>{children}</>;
}
