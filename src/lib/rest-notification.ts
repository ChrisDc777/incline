import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

const CHANNEL_ID = 'rest-timer';
const NOTIFICATION_ID = 'incline-rest-complete';

/**
 * Android Expo Go throws on import of expo-notifications (push token APIs were
 * removed in SDK 53). Local rest alerts need a development / production build.
 * See https://docs.expo.dev/develop/development-builds/introduction/
 */
const notificationsAvailable = !(isRunningInExpoGo() && Platform.OS === 'android');

type NotificationsModule = typeof import('expo-notifications');

let Notifications: NotificationsModule | null = null;
let channelReady = false;
let handlerReady = false;

function getNotifications(): NotificationsModule | null {
  if (!notificationsAvailable) return null;
  if (!Notifications) {
    // Lazy require so Expo Go Android never evaluates the module (top-level throw).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications') as NotificationsModule;
  }
  return Notifications;
}

function ensureHandler(mod: NotificationsModule): void {
  if (handlerReady) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerReady = true;
}

async function ensureChannel(mod: NotificationsModule): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  await mod.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Rest timer',
    importance: mod.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    sound: 'default',
  });
  channelReady = true;
}

async function ensurePermission(mod: NotificationsModule): Promise<boolean> {
  const current = await mod.getPermissionsAsync();
  if (current.granted || current.ios?.status === mod.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await mod.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === mod.IosAuthorizationStatus.PROVISIONAL;
}

/** Schedule (or replace) a local alert that fires when rest should end. */
export async function scheduleRestCompleteNotification(seconds: number): Promise<void> {
  if (seconds < 1) return;
  const mod = getNotifications();
  if (!mod) return;
  try {
    ensureHandler(mod);
    const ok = await ensurePermission(mod);
    if (!ok) return;
    await ensureChannel(mod);
    await mod.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});
    await mod.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: 'Rest complete',
        body: 'Time for your next set.',
        sound: 'default',
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
    });
  } catch {
    // Permissions / unsupported env — ignore
  }
}

/** Cancel any pending rest-complete alert. */
export async function cancelRestCompleteNotification(): Promise<void> {
  const mod = getNotifications();
  if (!mod) return;
  try {
    await mod.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  } catch {
    // ignore
  }
}
