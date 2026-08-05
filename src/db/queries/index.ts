export type { SessionSet, SessionWorkout } from './helpers';

export {
  listExercises,
  getExercise,
  getExerciseByExternalId,
  searchExercises,
  createCustomExercise,
  deleteCustomExercise,
  listCustomExercises,
  getCustomExerciseUsage,
  updateExerciseDefaultRest,
  getExerciseDefaultRest,
  ensureExerciseExists,
  getLastSetsForExercise,
  getExerciseHistory,
  getExercisePRSummary,
  getExerciseRepRecords,
  getExerciseProgression,
  type ExerciseFilters,
  type CreateCustomExerciseInput,
  type ExercisePRSummary,
  type RepRecord,
  type ProgressionPoint,
} from './exercises';

export {
  listTemplates,
  getTemplate,
  listTemplateSummaries,
  getSuggestedTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addExerciseToTemplate,
  updateTemplateExercise,
  removeTemplateExercise,
  reorderTemplateExercises,
  type TemplateSummary,
} from './templates';

export {
  listPrograms,
  getProgram,
} from './programs';

export {
  getWorkoutMuscleSplit,
  getActiveWorkout,
  getWorkoutLog,
  getRestDefaultsForSession,
  startWorkout,
  addExerciseToWorkout,
  addWarmUpSet,
  addSet,
  updateSet,
  removeSet,
  updateWorkoutNotes,
  updateWorkoutLogStartedAt,
  updateWorkoutDuration,
  finishWorkout,
  discardWorkout,
  listWorkoutLogs,
  listWorkoutFeedLogs,
  getWorkoutFeedForDay,
  deleteWorkout,
  clearWorkoutHistory,
  type MuscleSplit,
  type SetPatch,
} from './sessions';

export {
  getStreak,
  getProgressStats,
  getPeriodStats,
  getWorkoutDays,
  getWorkoutsByDateRange,
  getWorkoutsForDay,
  getWorkoutCountInRange,
} from './progress';

export {
  getProfile,
  saveProfile,
  completeOnboarding,
  resetUserData,
  seedSampleData,
} from './profile';

export {
  addBodyweightEntry,
  getBodyweightEntries,
  getLatestBodyweight,
  deleteBodyweightEntry,
} from './bodyweight';
