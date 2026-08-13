import { describe, expect, it } from 'vitest';

import {
  applyExportSelection,
  buildExportJson,
  buildMeasurementsCsv,
  buildSetsCsv,
  csvEscape,
  csvForSingleSection,
  rangeStartMs,
  stampFilename,
  type ExportPayload,
  type ExportSetRow,
} from '@/lib/export-data';

describe('export-data', () => {
  it('escapes CSV fields with commas and quotes', () => {
    expect(csvEscape('hello')).toBe('hello');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape(true)).toBe('1');
    expect(csvEscape(null)).toBe('');
  });

  it('maps export ranges to start timestamps', () => {
    const now = Date.parse('2026-08-09T12:00:00.000Z');
    expect(rangeStartMs('all', now)).toBeNull();
    expect(rangeStartMs('30d', now)).toBe(now - 30 * 86_400_000);
    expect(rangeStartMs('90d', now)).toBe(now - 90 * 86_400_000);
    expect(rangeStartMs('365d', now)).toBe(now - 365 * 86_400_000);
  });

  it('builds a set-level CSV with header', () => {
    const rows: ExportSetRow[] = [
      {
        workoutId: 1,
        workoutUuid: 'w1',
        workoutName: 'Push, A',
        startedAt: Date.parse('2026-08-01T10:00:00.000Z'),
        endedAt: Date.parse('2026-08-01T11:00:00.000Z'),
        durationSeconds: 3600,
        totalVolume: 1000,
        notes: '',
        exerciseId: 2,
        exerciseName: 'Bench',
        exerciseExternalId: 'bench',
        setIndex: 0,
        weight: 60,
        reps: 8,
        completed: true,
        restSeconds: 90,
        setType: 'working',
      },
    ];
    const csv = buildSetsCsv(rows);
    expect(csv.startsWith('workout_id,')).toBe(true);
    expect(csv).toContain('"Push, A"');
    expect(csv).toContain(',60,8,1,90,working');
  });

  it('stamps filenames and pretty-prints JSON', () => {
    expect(stampFilename('incline-workouts', 'csv', new Date('2026-08-09T00:00:00'))).toBe(
      'incline-workouts-20260809.csv',
    );
    const json = buildExportJson({
      exportedAt: '2026-08-09T00:00:00.000Z',
      version: 1,
      app: 'incline',
      range: 'all',
      profile: null,
      workouts: [],
      customExercises: [],
      bodyweight: [],
      bodyMeasurements: [],
    });
    expect(json).toContain('"app": "incline"');
    expect(json.endsWith('\n')).toBe(true);
  });

  it('keeps only selected sections in JSON', () => {
    const payload: ExportPayload = {
      exportedAt: '2026-08-09T00:00:00.000Z',
      version: 1,
      app: 'incline',
      range: 'all',
      profile: null,
      workouts: [{
        id: 1, uuid: null, name: 'A', startedAt: 1, endedAt: 2, durationSeconds: 1, totalVolume: 1, notes: '', sets: [],
      }],
      customExercises: [{ id: 9, uuid: null, name: 'My lift', primaryMuscle: 'chest', equipment: 'barbell', externalId: null }],
      bodyweight: [{ id: 1, weight: 80, unit: 'kg', recordedAt: 1 }],
      bodyMeasurements: [{ id: 1, metric: 'waist', value: 80, unit: 'cm', recordedAt: 1 }],
    };
    const filtered = applyExportSelection(payload, {
      workouts: false,
      customExercises: false,
      bodyweight: false,
      bodyMeasurements: true,
    });
    expect(filtered.workouts).toEqual([]);
    expect(filtered.bodyMeasurements).toHaveLength(1);
    const csv = csvForSingleSection('bodyMeasurements', filtered, []);
    expect(csv?.filenamePrefix).toBe('incline-measurements');
    expect(buildMeasurementsCsv(filtered.bodyMeasurements)).toContain('waist');
  });
});
