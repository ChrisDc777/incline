import type { NotificationPayload } from '@/lib/notifications/types';

/** In-app path for a typed payload (local + future remote push). */
export function pathForNotificationPayload(payload: NotificationPayload): string | null {
  switch (payload.type) {
    case 'workout_reminder':
    case 'rest_complete':
      return '/(app)/(tabs)';
    case 'weekly_digest':
      return '/(app)/report/week';
    case 'monthly_recap':
      // Phase C: monthly report. Home until then.
      return '/(app)/(tabs)';
    default:
      return null;
  }
}
