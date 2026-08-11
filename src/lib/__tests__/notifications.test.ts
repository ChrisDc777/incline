import { describe, expect, it } from 'vitest';

import { pathForNotificationPayload } from '@/lib/notifications/routes';
import {
  NOTIFICATION_IDS,
  isNotificationPayload,
  jsWeekdayToExpo,
} from '@/lib/notifications/types';

describe('jsWeekdayToExpo', () => {
  it('maps JS Sunday=0 to Expo Sunday=1 … Saturday=7', () => {
    expect(jsWeekdayToExpo(0)).toBe(1);
    expect(jsWeekdayToExpo(1)).toBe(2);
    expect(jsWeekdayToExpo(6)).toBe(7);
  });
});

describe('isNotificationPayload', () => {
  it('accepts known types', () => {
    expect(isNotificationPayload({ type: 'workout_reminder' })).toBe(true);
    expect(isNotificationPayload({ type: 'rest_complete' })).toBe(true);
    expect(isNotificationPayload({ type: 'weekly_digest', weekStart: '2026-08-03' })).toBe(true);
    expect(isNotificationPayload({ type: 'monthly_recap' })).toBe(true);
  });

  it('rejects unknown shapes', () => {
    expect(isNotificationPayload(null)).toBe(false);
    expect(isNotificationPayload({})).toBe(false);
    expect(isNotificationPayload({ type: 'promo' })).toBe(false);
  });
});

describe('NOTIFICATION_IDS', () => {
  it('uses stable reminder identifiers per weekday', () => {
    expect(NOTIFICATION_IDS.reminderDay(1)).toBe('incline-reminder-1');
    expect(NOTIFICATION_IDS.restComplete).toBe('incline-rest-complete');
  });
});

describe('pathForNotificationPayload', () => {
  it('routes reminder and digests to the right screens', () => {
    expect(pathForNotificationPayload({ type: 'workout_reminder' })).toBe('/(app)/(tabs)');
    expect(pathForNotificationPayload({ type: 'weekly_digest' })).toBe('/(app)/report/week');
    expect(pathForNotificationPayload({ type: 'monthly_recap' })).toBe('/(app)/report/month');
    expect(pathForNotificationPayload({ type: 'rest_complete' })).toBe('/(app)/(tabs)');
  });
});
