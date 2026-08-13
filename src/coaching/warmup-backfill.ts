/**
 * Conservative heuristic for tagging pre-`set_type` warm-ups.
 *
 * For each exercise in a session: take the heaviest completed set as peak.
 * Prefix sets before the first near-peak working set are warm-ups when they
 * are incomplete or clearly lighter than peak. Back-off sets after peak stay working.
 */

export const WARMUP_LOAD_FRACTION = 0.8;
export const WORKING_LOAD_FRACTION = 0.9;

export interface WarmupCandidateSet {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  setIndex: number;
  weight: number;
  completed: boolean;
  setType: string | null;
}

export function idsToTagAsWarmup(sets: WarmupCandidateSet[]): number[] {
  const groups = new Map<string, WarmupCandidateSet[]>();
  for (const s of sets) {
    const key = `${s.workoutLogId}:${s.exerciseId}`;
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }

  const ids: number[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.setIndex - b.setIndex);
    if (ordered.length < 2) continue;

    const peak = ordered.reduce((max, s) => (s.completed && s.weight > max ? s.weight : max), 0);
    if (peak <= 0) continue;

    const workingCut = peak * WORKING_LOAD_FRACTION;
    const warmupCut = peak * WARMUP_LOAD_FRACTION;
    const firstWorking = ordered.findIndex((s) => s.completed && s.weight >= workingCut);
    if (firstWorking <= 0) continue;

    const tagged: number[] = [];
    for (const s of ordered.slice(0, firstWorking)) {
      if (s.setType === 'warmup') continue;
      if (!s.completed || (s.weight > 0 && s.weight < warmupCut)) tagged.push(s.id);
    }
    if (tagged.length === 0) continue;
    if (ordered.length - tagged.length < 1) continue;
    ids.push(...tagged);
  }
  return ids;
}
