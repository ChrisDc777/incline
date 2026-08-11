/**
 * Whether auto-rest should start after completing a set.
 * Solo: always. Superset: only when every exercise in the group has completed
 * the same setIndex (one round finished).
 */
export function shouldStartRestAfterComplete(
  sets: Array<{
    id: number;
    exerciseId: number;
    setIndex: number;
    completed: boolean;
    supersetGroup: number | null;
  }>,
  completedSetId: number,
): { start: boolean; kind: 'set' | 'superset' } {
  const target = sets.find((s) => s.id === completedSetId);
  if (!target || !target.completed) return { start: false, kind: 'set' };

  const groupId = target.supersetGroup;
  if (groupId == null) return { start: true, kind: 'set' };

  const groupExerciseIds = [
    ...new Set(sets.filter((s) => s.supersetGroup === groupId).map((s) => s.exerciseId)),
  ];
  if (groupExerciseIds.length <= 1) return { start: true, kind: 'set' };

  const roundDone = groupExerciseIds.every((exerciseId) =>
    sets.some(
      (s) =>
        s.exerciseId === exerciseId &&
        s.supersetGroup === groupId &&
        s.setIndex === target.setIndex &&
        s.completed,
    ),
  );
  return { start: roundDone, kind: 'superset' };
}
