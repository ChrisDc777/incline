import type { NotificationPayload } from '@/lib/notifications/types';

/** In-app path for a typed payload (local + future remote push). */
export function pathForNotificationPayload(payload: NotificationPayload): string | null {
  switch (payload.type) {
    case 'workout_reminder':
    case 'rest_complete':
    case 'weekly_digest':
    case 'monthly_recap':
      // Digests get dedicated screens in Phase B/C; Home until then.
      return '/(app)/(tabs)';
    default:
      return null;
  }
}
