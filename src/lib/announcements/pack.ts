import type { Announcement } from './types';

/**
 * Curated in-app announcements (v1 static pack).
 * Remote campaigns can replace this later without changing Home card plumbing.
 */
export const ANNOUNCEMENT_PACK: Announcement[] = [
  {
    id: 'coaching-v1',
    kind: 'whats_new',
    title: 'Coaching is here',
    subtitle: 'See suggested loads on routines and after workouts — offline, with reasons.',
    href: '/(app)/(tabs)/progress',
  },
];
