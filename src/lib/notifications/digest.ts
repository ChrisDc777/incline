import { Platform } from 'react-native';

import { cancelNotification, prepareNotifications } from '@/lib/notifications/core';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDS,
  jsWeekdayToExpo,
  type NotificationPayload,
} from '@/lib/notifications/types';

export type WeeklyDigestPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Notification body; refreshed on sync from current-week recap. */
  body: string;
};

export async function cancelWeeklyDigest(): Promise<void> {
  await cancelNotification(NOTIFICATION_IDS.weeklyDigest);
}

/**
 * Idempotent Sunday weekly digest. Cancel → optionally reschedule.
 * Expo WEEKLY weekday: Sunday = 1.
 */
export async function syncWeeklyDigestSchedule(prefs: WeeklyDigestPrefs): Promise<boolean> {
  await cancelWeeklyDigest();
  if (!prefs.enabled) return true;

  const mod = await prepareNotifications(NOTIFICATION_CHANNELS.digests);
  if (!mod) return false;

  const hour = Math.min(23, Math.max(0, Math.round(prefs.hour)));
  const minute = Math.min(59, Math.max(0, Math.round(prefs.minute)));
  const data: NotificationPayload = { type: 'weekly_digest' };

  try {
    await mod.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.weeklyDigest,
      content: {
        title: 'Your week on Incline',
        body: prefs.body || 'Open Incline for your weekly training report.',
        sound: 'default',
        data,
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.WEEKLY,
        weekday: jsWeekdayToExpo(0),
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNELS.digests } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}
