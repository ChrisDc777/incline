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
  getLastSetsForExercises,
  getExerciseHistory,
  getExercisePRSummary,
  getExerciseRepRecords,
  getExerciseProgression,
  getExerciseSeries,
  type ExerciseFilters,
  type CreateCustomExerciseInput,
  type ExercisePRSummary,
  type RepRecord,
  type ProgressionPoint,
  type ExerciseSeriesPoint,
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
  duplicateTemplate,
  createTemplateFromWorkoutLog,
  type TemplateSummary,
} from './templates';

export {
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  setProgramDay,
  clearProgramDay,
  applyWeek1ToAllWeeks,
  getActiveProgramState,
  setActiveProgram,
  clearActiveProgram,
  getTodayProgramSlot,
  weekdayMon1,
  type ActiveProgramState,
  type TodayProgramSlot,
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
  restoreSet,
  updateWorkoutNotes,
  updateWorkoutLogStartedAt,
  updateWorkoutDuration,
  finishWorkout,
  discardWorkout,
  listWorkoutLogs,
  listExercisesUsedInHistory,
  listWorkoutFeedLogs,
  getWorkoutFeedForDay,
  getWorkoutPrCount,
  getWorkoutPrs,
  getPreviousTemplateVolume,
  deleteWorkout,
  clearWorkoutHistory,
  type MuscleSplit,
  type SetPatch,
  type WorkoutLogFilters,
  type WorkoutPr,
} from './sessions';

export {
  getStreak,
  getProgressStats,
  getPeriodStats,
  getWorkoutDays,
  getDailyVolumeByDate,
  getDailyCalendarMetrics,
  getWorkoutsByDateRange,
  getWorkoutsForDay,
  getWorkoutCountInRange,
  type DailyCalendarMetrics,
} from './progress';

export {
  getWeeklyRecap,
  weekBounds,
  formatWeekRangeLabel,
  weeklyDigestNotificationBody,
} from './recap';

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

export {
  shareWorkoutCsv,
  shareWorkoutJson,
} from './export';
