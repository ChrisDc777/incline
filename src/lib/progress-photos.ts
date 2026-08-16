import { startOfDay } from '@/db/calc';
import type { ProgressPhoto, WeekStartsOn } from '@/db/types';

const WEEK_MS = 7 * 86_400_000;

/** Local midnight of the week containing `ms`, using Settings Mon/Sun start. */
export function startOfWeekForSettings(ms: number, weekStartsOn: WeekStartsOn): number {
  const d = new Date(startOfDay(ms));
  const jsDay = d.getDay(); // 0 = Sunday
  const offset = weekStartsOn === 'sunday' ? jsDay : (jsDay + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

/** Human week range, e.g. "Aug 10–16", respecting `weekStartsOn`. */
export function progressPhotoWeekLabel(ms: number, weekStartsOn: WeekStartsOn): string {
  const startMs = startOfWeekForSettings(ms, weekStartsOn);
  const start = new Date(startMs);
  const end = new Date(startMs + WEEK_MS - 1);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)}–${end.toLocaleDateString(undefined, opts)}`;
}

export type ProgressPhotoWeekGroup = {
  weekStartMs: number;
  label: string;
  photos: ProgressPhoto[];
};

/** Newest week first — picker UX. Photos inside a week keep query order. */
export function groupProgressPhotosByWeek(
  photos: ProgressPhoto[],
  weekStartsOn: WeekStartsOn,
): ProgressPhotoWeekGroup[] {
  const map = new Map<number, ProgressPhoto[]>();
  for (const photo of photos) {
    const weekStartMs = startOfWeekForSettings(photo.startedAt, weekStartsOn);
    const list = map.get(weekStartMs);
    if (list) list.push(photo);
    else map.set(weekStartMs, [photo]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weekStartMs, weekPhotos]) => ({
      weekStartMs,
      label: progressPhotoWeekLabel(weekStartMs, weekStartsOn),
      photos: weekPhotos,
    }));
}
