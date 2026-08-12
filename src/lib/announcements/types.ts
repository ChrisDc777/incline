export type AnnouncementKind = 'whats_new' | 'promo' | 'festival';

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  subtitle: string;
  /** In-app route (Expo Router path). */
  href?: string;
  startsAt?: number;
  endsAt?: number;
}
