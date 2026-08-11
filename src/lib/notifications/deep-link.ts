import { router, type Href } from 'expo-router';

import { pathForNotificationPayload } from '@/lib/notifications/routes';
import { isNotificationPayload } from '@/lib/notifications/types';

export function navigateFromNotificationData(data: unknown): void {
  if (!isNotificationPayload(data)) return;
  const path = pathForNotificationPayload(data);
  if (!path) return;
  try {
    router.push(path as Href);
  } catch {
    // Router may not be mounted yet; cold-start path retries via last response.
  }
}
