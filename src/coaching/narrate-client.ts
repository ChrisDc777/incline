import {
  COACH_NARRATE_PROMPT_VERSION,
  hashFeaturePack,
  type FeaturePackV1,
  type NarrateSurface,
} from './feature-pack';
import { validateNarrationResponse, type CoachNarration } from './narrate-validate';
import type { CoachingInsightKind } from './types';
import type { GetToken } from '@/sync/supabase-auth';

export type { CoachNarration } from './narrate-validate';
export type { NarrateSurface };

export const COACH_NARRATE_KV_PREFIX = 'coach.narrate.';
export const COACH_NARRATE_TIMEOUT_MS = 12_000;

export const SAFE_HOME_NARRATE_KINDS: ReadonlySet<CoachingInsightKind> = new Set([
  'volume_trend',
  'overload_ready',
  'recovery_gap',
  'muscle_balance',
]);

export function coachNarrateKvKey(
  userId: string,
  packHash: string,
  promptVersion: string,
  surface: string,
): string {
  return `${COACH_NARRATE_KV_PREFIX}${userId}.${packHash}.${promptVersion}.${surface}`;
}

export interface RequestCoachNarrationInput {
  surface: NarrateSurface;
  pack: FeaturePackV1;
  getToken: GetToken;
  userId: string | null | undefined;
}

export interface NarrateClientOverrides {
  aiExplanationsEnabled?: boolean;
  backendReady?: boolean;
  kv?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  };
  fetchImpl?: typeof fetch;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const inflight = new Map<string, Promise<CoachNarration | null>>();

async function readAiEnabled(override?: boolean): Promise<boolean> {
  if (typeof override === 'boolean') return override;
  const { useSettings } = await import('@/store/settings-store');
  return useSettings.getState().aiExplanationsEnabled === true;
}

async function readBackendReady(override?: boolean): Promise<boolean> {
  if (typeof override === 'boolean') return override;
  const { syncBackendReady } = await import('@/sync/supabase-auth');
  return syncBackendReady();
}

async function readKv(override?: NarrateClientOverrides['kv']) {
  if (override) return override;
  const { kvStorage } = await import('@/db/kv');
  return kvStorage;
}

function parseCached(raw: string | null): CoachNarration | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.headline !== 'string' || !Array.isArray(rec.paragraphs)) return null;
    return {
      headline: rec.headline,
      paragraphs: rec.paragraphs.filter((p): p is string => typeof p === 'string'),
      citedInsightIds: Array.isArray(rec.citedInsightIds)
        ? rec.citedInsightIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Optional AI wording for a FeaturePack. Never throws — callers keep rule copy on null.
 */
export async function requestCoachNarration(
  input: RequestCoachNarrationInput,
  overrides?: NarrateClientOverrides,
): Promise<CoachNarration | null> {
  try {
    if (!input.userId) return null;
    if (!(await readAiEnabled(overrides?.aiExplanationsEnabled))) return null;
    if (!(await readBackendReady(overrides?.backendReady))) return null;

    const pack: FeaturePackV1 = { ...input.pack, surface: input.surface };
    const packHash = await hashFeaturePack(pack);
    const cacheKey = coachNarrateKvKey(
      input.userId,
      packHash,
      COACH_NARRATE_PROMPT_VERSION,
      input.surface,
    );

    const existing = inflight.get(cacheKey);
    if (existing) return existing;

    const pending = (async () => {
      const kv = await readKv(overrides?.kv);
      const cached = parseCached(await kv.getItem(cacheKey));
      if (cached) return cached;

      const url = overrides?.supabaseUrl ?? (await import('@/lib/env')).SUPABASE_URL;
      const anon = overrides?.supabaseAnonKey ?? (await import('@/lib/env')).SUPABASE_ANON_KEY;
      if (!url || !anon || url === 'your_supabase_url') return null;

      let token: string | null = null;
      try {
        token = await input.getToken({ template: 'supabase' });
      } catch {
        token = null;
      }
      if (!token) {
        try {
          token = await input.getToken();
        } catch {
          return null;
        }
      }
      if (!token) return null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), COACH_NARRATE_TIMEOUT_MS);
      const fetchImpl = overrides?.fetchImpl ?? fetch;
      try {
        const res = await fetchImpl(`${url.replace(/\/$/, '')}/functions/v1/coach-narrate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anon,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pack,
            packHash,
            promptVersion: COACH_NARRATE_PROMPT_VERSION,
            surface: input.surface,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const json: unknown = await res.json();
        if (!json || typeof json !== 'object') return null;
        const body = json as Record<string, unknown>;
        if (body.ok !== true) return null;
        const checked = validateNarrationResponse(body.narration, pack);
        if (!checked.ok) return null;
        await kv.setItem(cacheKey, JSON.stringify(checked.narration));
        return checked.narration;
      } finally {
        clearTimeout(timer);
      }
    })();

    inflight.set(cacheKey, pending);
    try {
      return await pending;
    } finally {
      inflight.delete(cacheKey);
    }
  } catch {
    return null;
  }
}

/** Wipe local narration cache (account switch). Settings flag is left as-is. */
export async function clearCoachNarrationCache(): Promise<void> {
  const { kvStorage } = await import('@/db/kv');
  await kvStorage.removeKeysWithPrefix(COACH_NARRATE_KV_PREFIX);
}
