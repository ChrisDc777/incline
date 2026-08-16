import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algo: string, value: string) =>
    createHash('sha256').update(value, 'utf8').digest('hex'),
}));

import { COACHING_RULE_VERSION, type CoachingInsight, type TrainingSuggestion } from '../types';
import {
  MAX_FEATURE_PACK_BYTES,
  MAX_FEATURE_PACK_INSIGHTS,
  MAX_FEATURE_PACK_SUGGESTIONS,
  assertFeaturePackSize,
  buildFeaturePackV1,
  canonicalizeFeaturePack,
  hashFeaturePack,
  validateFeaturePack,
  type FeaturePackV1,
} from '../feature-pack';

function insight(
  partial: Partial<CoachingInsight> & Pick<CoachingInsight, 'id' | 'kind'>,
): CoachingInsight {
  return {
    severity: 'info',
    title: 'Title',
    body: 'Body',
    ruleVersion: COACHING_RULE_VERSION,
    href: '/(app)/progress',
    ...partial,
  };
}

function suggestion(partial?: Partial<TrainingSuggestion>): TrainingSuggestion {
  return {
    exerciseId: 42,
    exerciseName: 'Bench',
    weight: 80,
    reps: 8,
    targetSets: 3,
    reasonCode: 'hit_rep_range_increase_load',
    reasonText: 'add load',
    ruleVersion: COACHING_RULE_VERSION,
    ...partial,
  };
}

function minimalPack(overrides?: Partial<FeaturePackV1>): FeaturePackV1 {
  return {
    version: 'FeaturePackV1',
    ruleVersion: COACHING_RULE_VERSION,
    unit: 'metric',
    surface: 'home',
    insights: [],
    suggestions: [],
    aggregates: {},
    ...overrides,
  };
}

describe('canonicalizeFeaturePack / hashFeaturePack', () => {
  it('produces a stable hash regardless of object key order', async () => {
    const a = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      insights: [insight({ id: 'volume-trend', kind: 'volume_trend' })],
      aggregates: { prCount: 1, weeklyStreak: 3 },
    });
    const shuffled = {
      aggregates: { weeklyStreak: 3, prCount: 1 },
      suggestions: [],
      surface: 'home' as const,
      unit: 'metric' as const,
      insights: [{ body: 'Body', id: 'volume-trend', kind: 'volume_trend', severity: 'info', title: 'Title' }],
      ruleVersion: COACHING_RULE_VERSION,
      version: 'FeaturePackV1' as const,
    };
    expect(canonicalizeFeaturePack(a)).toBe(canonicalizeFeaturePack(shuffled));
    expect(await hashFeaturePack(a)).toBe(await hashFeaturePack(shuffled));
  });

  it('ignores generatedAt when hashing', async () => {
    const base = buildFeaturePackV1({ unit: 'imperial', surface: 'post_session' });
    const stamped = buildFeaturePackV1({
      unit: 'imperial',
      surface: 'post_session',
      generatedAt: 1_700_000_000_000,
    });
    expect(await hashFeaturePack(base)).toBe(await hashFeaturePack(stamped));
    expect(canonicalizeFeaturePack(stamped)).not.toContain('generatedAt');
  });

  it('changes hash when ruleVersion changes', async () => {
    const a = buildFeaturePackV1({ unit: 'metric', surface: 'home', ruleVersion: '1.3.0' });
    const b = buildFeaturePackV1({ unit: 'metric', surface: 'home', ruleVersion: '1.4.0' });
    expect(await hashFeaturePack(a)).not.toBe(await hashFeaturePack(b));
  });
});

describe('buildFeaturePackV1', () => {
  it('caps insights and suggestions', () => {
    const insights = Array.from({ length: MAX_FEATURE_PACK_INSIGHTS + 4 }, (_, i) =>
      insight({ id: `i-${i}`, kind: 'recovery_gap' }),
    );
    const suggestions = Array.from({ length: MAX_FEATURE_PACK_SUGGESTIONS + 3 }, (_, i) =>
      suggestion({ exerciseName: `Ex ${i}`, exerciseId: i }),
    );
    const pack = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      insights,
      suggestions,
    });
    expect(pack.insights).toHaveLength(MAX_FEATURE_PACK_INSIGHTS);
    expect(pack.suggestions).toHaveLength(MAX_FEATURE_PACK_SUGGESTIONS);
  });

  it('strips href and exerciseId', () => {
    const pack = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      insights: [insight({ id: 'muscle-balance', kind: 'muscle_balance', href: '/(app)/muscle-distribution' })],
      suggestions: [suggestion({ exerciseId: 99 })],
    });
    expect(pack.insights[0]).toEqual({
      id: 'muscle-balance',
      kind: 'muscle_balance',
      severity: 'info',
      title: 'Title',
      body: 'Body',
    });
    expect(pack.insights[0]).not.toHaveProperty('href');
    expect(pack.suggestions[0]).not.toHaveProperty('exerciseId');
    expect(pack.suggestions[0].exerciseName).toBe('Bench');
  });

  it('keeps deload and program_plan id/kind without href', () => {
    const pack = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      insights: [
        insight({
          id: 'deload-week',
          kind: 'deload',
          severity: 'warning',
          href: '/(app)/deload',
        }),
        insight({
          id: 'program-plan-catch_up',
          kind: 'program_plan',
          severity: 'warning',
          href: '/(app)/program-adjust?kind=catch_up',
        }),
      ],
    });
    expect(pack.insights.map((i) => ({ id: i.id, kind: i.kind }))).toEqual([
      { id: 'deload-week', kind: 'deload' },
      { id: 'program-plan-catch_up', kind: 'program_plan' },
    ]);
    for (const item of pack.insights) {
      expect(item).not.toHaveProperty('href');
    }
  });

  it('caps recentWeeks at 4', () => {
    const pack = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      aggregates: {
        recentWeeks: Array.from({ length: 6 }, (_, i) => ({ sessions: i, volume: i * 100 })),
      },
    });
    expect(pack.aggregates.recentWeeks).toHaveLength(4);
  });
});

describe('validateFeaturePack', () => {
  it('accepts a well-formed pack', () => {
    const pack = buildFeaturePackV1({
      unit: 'metric',
      surface: 'post_session',
      insights: [insight({ id: 'pr', kind: 'post_session' })],
      suggestions: [suggestion()],
      aggregates: { prCount: 1, volumeDeltaPct: 12, readiness: 'ok' },
    });
    expect(validateFeaturePack(pack)).toEqual({ ok: true, pack });
  });

  it('rejects malformed packs', () => {
    expect(validateFeaturePack(null).ok).toBe(false);
    expect(validateFeaturePack({ ...minimalPack(), version: 'v0' }).ok).toBe(false);
    expect(validateFeaturePack({ ...minimalPack(), unit: 'stones' }).ok).toBe(false);
    expect(validateFeaturePack({ ...minimalPack(), surface: 'email' }).ok).toBe(false);
    expect(validateFeaturePack({ ...minimalPack(), insights: 'nope' }).ok).toBe(false);
    expect(
      validateFeaturePack({
        ...minimalPack(),
        insights: [{ id: 'x', kind: 'k', severity: 'info', title: 't', body: 'b', href: '/x' }],
      }).ok,
    ).toBe(false);
    expect(
      validateFeaturePack({
        ...minimalPack(),
        suggestions: [
          {
            exerciseName: 'Squat',
            weight: 100,
            reps: 5,
            targetSets: 3,
            reasonCode: 'hold',
            reasonText: 'hold',
            exerciseId: 1,
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it('rejects oversized packs', () => {
    const huge = buildFeaturePackV1({
      unit: 'metric',
      surface: 'home',
      insights: [
        insight({
          id: 'huge',
          kind: 'volume_trend',
          body: 'x'.repeat(MAX_FEATURE_PACK_BYTES),
        }),
      ],
    });
    expect(validateFeaturePack(huge).ok).toBe(false);
    expect(() => assertFeaturePackSize(huge)).toThrow(/exceeds/);
  });
});
