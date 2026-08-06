import type { SupabaseClient } from '@supabase/supabase-js';

import { openDatabase } from '@/db/client';
import { newUuid } from '@/lib/uuid';
import type { ExerciseRef, SyncTable } from './types';
import {
  bumpOutboxAttempt,
  listOutbox,
  removeOutbox,
  type OutboxRow,
} from './outbox';
import { getSyncStatus, setSyncStatus } from './state';
import { getAuthedSupabase, syncBackendReady, type GetToken } from './supabase-auth';
import { resolveExerciseRef } from './exercise-ref';

const PUSH_ORDER: SyncTable[] = [
  'user_exercises',
  'user_templates',
  'user_template_exercises',
  'workout_logs',
  'set_entries',
  'bodyweight_entries',
  'profiles',
];

const PULL_TABLES: { table: SyncTable; cloud: string; idCol: string }[] = [
  { table: 'user_exercises', cloud: 'user_exercises', idCol: 'id' },
  { table: 'user_templates', cloud: 'user_templates', idCol: 'id' },
  { table: 'user_template_exercises', cloud: 'user_template_exercises', idCol: 'id' },
  { table: 'workout_logs', cloud: 'workout_logs', idCol: 'id' },
  { table: 'set_entries', cloud: 'set_entries', idCol: 'id' },
  { table: 'bodyweight_entries', cloud: 'bodyweight_entries', idCol: 'id' },
  { table: 'profiles', cloud: 'profiles', idCol: 'user_id' },
];

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  return new Date(ms).toISOString();
}

function isoToMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
}

function sortOutbox(rows: OutboxRow[]): OutboxRow[] {
  return [...rows].sort((a, b) => {
    const ai = PUSH_ORDER.indexOf(a.tableName);
    const bi = PUSH_ORDER.indexOf(b.tableName);
    if (ai !== bi) return ai - bi;
    return a.id - b.id;
  });
}

function exerciseRefToCloud(ref: ExerciseRef | undefined): {
  ref_type: string;
  catalog_external_id: string | null;
  user_exercise_id: string | null;
} {
  if (!ref || ref.ref === 'unknown') {
    return { ref_type: 'catalog', catalog_external_id: 'unknown', user_exercise_id: null };
  }
  if (ref.ref === 'catalog') {
    return { ref_type: 'catalog', catalog_external_id: ref.externalId, user_exercise_id: null };
  }
  return { ref_type: 'custom', catalog_external_id: null, user_exercise_id: ref.exerciseUuid };
}

function cloudToExerciseRef(row: {
  ref_type?: string;
  catalog_external_id?: string | null;
  user_exercise_id?: string | null;
}): ExerciseRef {
  if (row.ref_type === 'custom' && row.user_exercise_id) {
    return { ref: 'custom', exerciseUuid: row.user_exercise_id };
  }
  if (row.catalog_external_id) {
    return { ref: 'catalog', externalId: row.catalog_external_id };
  }
  return { ref: 'unknown' };
}

async function pushOne(
  client: SupabaseClient,
  userId: string,
  item: OutboxRow,
): Promise<'ok' | 'retry'> {
  const payload = item.payload ? (JSON.parse(item.payload) as Record<string, unknown>) : {};
  const updatedAt = (payload.updated_at as number) ?? Date.now();
  const deletedAt = (payload.deleted_at as number | null) ?? null;

  try {
    if (item.tableName === 'profiles') {
      if (item.op === 'delete') {
        const { error } = await client
          .from('profiles')
          .update({ deleted_at: msToIso(deletedAt ?? Date.now()), updated_at: msToIso(updatedAt) })
          .eq('user_id', userId);
        if (error) throw error;
        return 'ok';
      }
      const { data: existing } = await client
        .from('profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      const remoteMs = isoToMs(existing?.updated_at as string | undefined) ?? 0;
      if (existing && remoteMs > updatedAt) return 'ok'; // LWW: remote newer

      const { error } = await client.from('profiles').upsert({
        user_id: userId,
        name: payload.name ?? '',
        goal: payload.goal ?? 'build_muscle',
        bodyweight: payload.bodyweight ?? null,
        unit: payload.unit ?? 'metric',
        experience_level: payload.experience_level ?? 'intermediate',
        onboarding_completed: !!(payload.onboarding_completed),
        avatar_url: payload.avatar_url ?? null,
        updated_at: msToIso(updatedAt),
        deleted_at: msToIso(deletedAt),
      });
      if (error) throw error;
      return 'ok';
    }

    const cloudTable =
      item.tableName === 'user_exercises'
        ? 'user_exercises'
        : item.tableName === 'user_templates'
          ? 'user_templates'
          : item.tableName === 'user_template_exercises'
            ? 'user_template_exercises'
            : item.tableName === 'workout_logs'
              ? 'workout_logs'
              : item.tableName === 'set_entries'
                ? 'set_entries'
                : item.tableName === 'bodyweight_entries'
                  ? 'bodyweight_entries'
                  : null;
    if (!cloudTable) return 'ok';

    if (item.op === 'delete') {
      const { data: existing } = await client
        .from(cloudTable)
        .select('updated_at')
        .eq('id', item.rowUuid)
        .maybeSingle();
      const remoteMs = isoToMs(existing?.updated_at as string | undefined) ?? 0;
      if (existing && remoteMs > updatedAt) return 'ok';
      const { error } = await client
        .from(cloudTable)
        .update({ deleted_at: msToIso(deletedAt ?? Date.now()), updated_at: msToIso(updatedAt) })
        .eq('id', item.rowUuid)
        .eq('user_id', userId);
      if (error) throw error;
      return 'ok';
    }

    const { data: existing } = await client
      .from(cloudTable)
      .select('updated_at')
      .eq('id', item.rowUuid)
      .maybeSingle();
    const remoteMs = isoToMs(existing?.updated_at as string | undefined) ?? 0;
    if (existing && remoteMs > updatedAt) return 'ok';

    let row: Record<string, unknown> = {
      id: item.rowUuid,
      user_id: userId,
      updated_at: msToIso(updatedAt),
      deleted_at: msToIso(deletedAt),
    };

    if (cloudTable === 'user_exercises') {
      row = {
        ...row,
        name: payload.name,
        primary_muscle: payload.primary_muscle,
        movement_pattern: payload.movement_pattern,
        equipment: payload.equipment,
        category: payload.category,
        is_compound: !!(payload.is_compound),
        tips: payload.tips ?? '',
        aliases: payload.aliases ?? [],
        secondary_muscles: payload.secondary_muscles ?? [],
        instructions: payload.instructions ?? [],
        created_at: msToIso(payload.created_at as number) ?? msToIso(updatedAt),
      };
    } else if (cloudTable === 'user_templates') {
      row = {
        ...row,
        name: payload.name,
        description: payload.description ?? '',
        category: payload.category ?? 'strength',
        difficulty: payload.difficulty ?? 'intermediate',
        estimated_minutes: payload.estimated_minutes ?? 45,
        created_at: msToIso(payload.created_at as number) ?? msToIso(updatedAt),
      };
    } else if (cloudTable === 'user_template_exercises') {
      const ex = exerciseRefToCloud(payload.exercise_ref as ExerciseRef | undefined);
      row = {
        ...row,
        template_id: payload.template_uuid,
        ...ex,
        sort_order: payload.sort_order ?? 0,
        target_sets: payload.target_sets ?? 3,
        target_reps_min: payload.target_reps_min ?? 8,
        target_reps_max: payload.target_reps_max ?? 12,
        rest_seconds: payload.rest_seconds ?? 90,
        notes: payload.notes ?? '',
      };
    } else if (cloudTable === 'workout_logs') {
      row = {
        ...row,
        template_id: payload.template_uuid ?? null,
        name: payload.name,
        started_at: msToIso(payload.started_at as number),
        ended_at: msToIso(payload.ended_at as number | null),
        duration_seconds: payload.duration_seconds ?? 0,
        total_volume: payload.total_volume ?? 0,
        unit: payload.unit ?? 'metric',
        notes: payload.notes ?? '',
        created_at: msToIso(payload.created_at as number) ?? msToIso(updatedAt),
      };
    } else if (cloudTable === 'set_entries') {
      const ex = exerciseRefToCloud(payload.exercise_ref as ExerciseRef | undefined);
      row = {
        ...row,
        workout_log_id: payload.workout_log_uuid,
        ...ex,
        set_index: payload.set_index ?? 0,
        weight: payload.weight ?? 0,
        reps: payload.reps ?? 0,
        completed: !!(payload.completed),
        rest_seconds: payload.rest_seconds ?? null,
        created_at: msToIso(payload.created_at as number) ?? msToIso(updatedAt),
      };
    } else if (cloudTable === 'bodyweight_entries') {
      row = {
        ...row,
        weight: payload.weight,
        unit: payload.unit ?? 'kg',
        recorded_at: msToIso(payload.recorded_at as number),
        created_at: msToIso(payload.created_at as number) ?? msToIso(updatedAt),
      };
    }

    const { error } = await client.from(cloudTable).upsert(row);
    if (error) throw error;
    return 'ok';
  } catch (err) {
    console.warn('[sync] push failed', item.tableName, item.rowUuid, err);
    return 'retry';
  }
}

function asStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  return String(v);
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function applyRemoteRow(
  table: SyncTable,
  remote: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const db = await openDatabase();
  const updatedAt = isoToMs(asStr(remote.updated_at)) ?? Date.now();
  const deletedAt = isoToMs(remote.deleted_at as string | null);

  if (table === 'profiles') {
    const local = await db.getFirstAsync<{ updated_at: number; uuid: string | null }>(
      'SELECT updated_at, uuid FROM user_profile WHERE id = 1',
    );
    if (local && local.updated_at > updatedAt) return;
    const uuid = local?.uuid ?? newUuid();
    await db.runAsync(
      `INSERT INTO user_profile (id, name, goal, bodyweight, unit, experience_level, onboarding_completed, avatar_url, uuid, deleted_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, goal = excluded.goal, bodyweight = excluded.bodyweight,
         unit = excluded.unit, experience_level = excluded.experience_level,
         onboarding_completed = excluded.onboarding_completed, avatar_url = excluded.avatar_url,
         uuid = excluded.uuid, deleted_at = excluded.deleted_at, updated_at = excluded.updated_at`,
      asStr(remote.name),
      asStr(remote.goal, 'build_muscle'),
      asNumOrNull(remote.bodyweight),
      asStr(remote.unit, 'metric'),
      asStr(remote.experience_level, 'intermediate'),
      remote.onboarding_completed ? 1 : 0,
      remote.avatar_url == null ? null : asStr(remote.avatar_url),
      uuid,
      deletedAt,
      updatedAt,
    );
    return;
  }

  const id = asStr(remote.id);
  if (table === 'user_exercises') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number }>(
      'SELECT id, updated_at FROM exercises WHERE uuid = ?',
      id,
    );
    if (local && local.updated_at > updatedAt) return;
    if (local) {
      await db.runAsync(
        `UPDATE exercises SET name = ?, primary_muscle = ?, movement_pattern = ?, equipment = ?, category = ?,
         is_compound = ?, tips = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        asStr(remote.name),
        asStr(remote.primary_muscle),
        remote.movement_pattern == null ? null : asStr(remote.movement_pattern),
        asStr(remote.equipment),
        asStr(remote.category),
        remote.is_compound ? 1 : 0,
        asStr(remote.tips),
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt) {
      const created = isoToMs(asStr(remote.created_at)) ?? updatedAt;
      await db.runAsync(
        `INSERT INTO exercises (name, primary_muscle, movement_pattern, equipment, category, is_compound, is_custom, source, tips, uuid, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'custom', ?, ?, ?, ?, ?)`,
        asStr(remote.name),
        asStr(remote.primary_muscle),
        remote.movement_pattern == null ? null : asStr(remote.movement_pattern),
        asStr(remote.equipment),
        asStr(remote.category),
        remote.is_compound ? 1 : 0,
        asStr(remote.tips),
        id,
        created,
        updatedAt,
        deletedAt,
      );
    }
    return;
  }

  if (table === 'user_templates') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number }>(
      'SELECT id, updated_at FROM workout_templates WHERE uuid = ?',
      id,
    );
    if (local && local.updated_at > updatedAt) return;
    if (local) {
      await db.runAsync(
        `UPDATE workout_templates SET name = ?, description = ?, category = ?, difficulty = ?, estimated_minutes = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        asStr(remote.name),
        asStr(remote.description),
        asStr(remote.category, 'strength'),
        asStr(remote.difficulty, 'intermediate'),
        asNum(remote.estimated_minutes, 45),
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt) {
      const created = isoToMs(asStr(remote.created_at)) ?? updatedAt;
      await db.runAsync(
        `INSERT INTO workout_templates (name, description, category, difficulty, estimated_minutes, is_custom, uuid, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        asStr(remote.name),
        asStr(remote.description),
        asStr(remote.category, 'strength'),
        asStr(remote.difficulty, 'intermediate'),
        asNum(remote.estimated_minutes, 45),
        id,
        created,
        updatedAt,
        deletedAt,
      );
    }
    return;
  }

  if (table === 'user_template_exercises') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number | null }>(
      'SELECT id, updated_at FROM template_exercises WHERE uuid = ?',
      id,
    );
    if (local && (local.updated_at ?? 0) > updatedAt) return;
    const template = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workout_templates WHERE uuid = ?',
      asStr(remote.template_id),
    );
    if (!template) return;
    const exId = await resolveExerciseRef(cloudToExerciseRef(remote as never));
    if (exId == null && !deletedAt) return;
    if (local) {
      await db.runAsync(
        `UPDATE template_exercises SET exercise_id = COALESCE(?, exercise_id), sort_order = ?, target_sets = ?, target_reps_min = ?, target_reps_max = ?, rest_seconds = ?, notes = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        exId,
        asNum(remote.sort_order),
        asNum(remote.target_sets, 3),
        asNum(remote.target_reps_min, 8),
        asNum(remote.target_reps_max, 12),
        asNum(remote.rest_seconds, 90),
        asStr(remote.notes),
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt && exId != null) {
      await db.runAsync(
        `INSERT INTO template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, rest_seconds, notes, uuid, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        template.id,
        exId,
        asNum(remote.sort_order),
        asNum(remote.target_sets, 3),
        asNum(remote.target_reps_min, 8),
        asNum(remote.target_reps_max, 12),
        asNum(remote.rest_seconds, 90),
        asStr(remote.notes),
        id,
        updatedAt,
        deletedAt,
      );
    }
    return;
  }

  if (table === 'workout_logs') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number }>(
      'SELECT id, updated_at FROM workout_logs WHERE uuid = ?',
      id,
    );
    if (local && local.updated_at > updatedAt) return;
    let templateId: number | null = null;
    if (remote.template_id) {
      const t = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM workout_templates WHERE uuid = ?',
        asStr(remote.template_id),
      );
      templateId = t?.id ?? null;
    }
    const startedAt = isoToMs(asStr(remote.started_at)) ?? updatedAt;
    const endedAt = isoToMs(remote.ended_at as string | null);
    if (local) {
      await db.runAsync(
        `UPDATE workout_logs SET template_id = ?, name = ?, started_at = ?, ended_at = ?, duration_seconds = ?, total_volume = ?, unit = ?, notes = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        templateId,
        asStr(remote.name),
        startedAt,
        endedAt,
        asNum(remote.duration_seconds),
        asNum(remote.total_volume),
        asStr(remote.unit, 'metric'),
        asStr(remote.notes),
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt) {
      const created = isoToMs(asStr(remote.created_at)) ?? updatedAt;
      await db.runAsync(
        `INSERT INTO workout_logs (template_id, name, started_at, ended_at, duration_seconds, total_volume, unit, notes, uuid, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        templateId,
        asStr(remote.name),
        startedAt,
        endedAt,
        asNum(remote.duration_seconds),
        asNum(remote.total_volume),
        asStr(remote.unit, 'metric'),
        asStr(remote.notes),
        id,
        created,
        updatedAt,
        deletedAt,
      );
    }
    return;
  }

  if (table === 'set_entries') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number }>(
      'SELECT id, updated_at FROM set_entries WHERE uuid = ?',
      id,
    );
    if (local && local.updated_at > updatedAt) return;
    const log = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workout_logs WHERE uuid = ?',
      asStr(remote.workout_log_id),
    );
    if (!log) return;
    const exId = await resolveExerciseRef(cloudToExerciseRef(remote as never));
    if (exId == null && !deletedAt) return;
    if (local) {
      await db.runAsync(
        `UPDATE set_entries SET exercise_id = COALESCE(?, exercise_id), set_index = ?, weight = ?, reps = ?, completed = ?, rest_seconds = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        exId,
        asNum(remote.set_index),
        asNum(remote.weight),
        asNum(remote.reps),
        remote.completed ? 1 : 0,
        asNumOrNull(remote.rest_seconds),
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt && exId != null) {
      const created = isoToMs(asStr(remote.created_at)) ?? updatedAt;
      await db.runAsync(
        `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, uuid, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        log.id,
        exId,
        asNum(remote.set_index),
        asNum(remote.weight),
        asNum(remote.reps),
        remote.completed ? 1 : 0,
        asNumOrNull(remote.rest_seconds),
        id,
        created,
        updatedAt,
        deletedAt,
      );
    }
    return;
  }

  if (table === 'bodyweight_entries') {
    const local = await db.getFirstAsync<{ id: number; updated_at: number }>(
      'SELECT id, updated_at FROM bodyweight_entries WHERE uuid = ?',
      id,
    );
    if (local && local.updated_at > updatedAt) return;
    const recordedAt = isoToMs(asStr(remote.recorded_at)) ?? updatedAt;
    if (local) {
      await db.runAsync(
        `UPDATE bodyweight_entries SET weight = ?, unit = ?, recorded_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
        asNum(remote.weight),
        asStr(remote.unit, 'kg'),
        recordedAt,
        updatedAt,
        deletedAt,
        local.id,
      );
    } else if (!deletedAt) {
      const created = isoToMs(asStr(remote.created_at)) ?? updatedAt;
      await db.runAsync(
        `INSERT INTO bodyweight_entries (weight, unit, recorded_at, uuid, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        asNum(remote.weight),
        asStr(remote.unit, 'kg'),
        recordedAt,
        id,
        created,
        updatedAt,
        deletedAt,
      );
    }
  }

  void userId;
}

async function pullAll(client: SupabaseClient, userId: string, cursor: number): Promise<number> {
  let maxCursor = cursor;
  const cursorIso = new Date(cursor).toISOString();

  for (const { table, cloud } of PULL_TABLES) {
    const { data, error } = await client
      .from(cloud)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursorIso)
      .order('updated_at', { ascending: true })
      .limit(500);

    if (error) {
      // profiles uses user_id as PK; filter still applies
      if (cloud === 'profiles') {
        const res = await client.from('profiles').select('*').eq('user_id', userId).maybeSingle();
        if (res.error) throw res.error;
        if (res.data) {
          const ms = isoToMs(res.data.updated_at as string) ?? 0;
          if (ms > cursor) {
            await applyRemoteRow('profiles', res.data as Record<string, unknown>, userId);
            maxCursor = Math.max(maxCursor, ms);
          }
        }
        continue;
      }
      throw error;
    }

    for (const row of data ?? []) {
      await applyRemoteRow(table, row as Record<string, unknown>, userId);
      const ms = isoToMs((row as { updated_at?: string }).updated_at) ?? 0;
      if (ms > maxCursor) maxCursor = ms;
    }
  }

  return maxCursor;
}

let _running = false;

export interface SyncResult {
  ok: boolean;
  pushed: number;
  error?: string;
}

/**
 * Push outbox then pull remote changes. Safe to call frequently; coalesces concurrent runs.
 */
export async function runSync(opts: {
  userId: string;
  getToken: GetToken;
}): Promise<SyncResult> {
  if (_running) return { ok: true, pushed: 0 };
  if (!syncBackendReady()) {
    return { ok: false, pushed: 0, error: 'Supabase not configured' };
  }

  _running = true;
  await setSyncStatus({ status: 'syncing', lastError: null });

  try {
    const client = await getAuthedSupabase(opts.getToken);
    if (!client) {
      await setSyncStatus({ status: 'error', lastError: 'Not authenticated for sync' });
      return { ok: false, pushed: 0, error: 'Not authenticated for sync' };
    }

    const pending = sortOutbox(await listOutbox(200));
    let pushed = 0;
    for (const item of pending) {
      const result = await pushOne(client, opts.userId, item);
      if (result === 'ok') {
        await removeOutbox(item.id);
        pushed++;
      } else {
        await bumpOutboxAttempt(item.id);
        // Exponential-ish backoff: stop batch after first failure to preserve order
        if (item.attempts >= 8) {
          await setSyncStatus({
            status: 'error',
            lastError: `Failed to sync ${item.tableName} after retries`,
          });
          return { ok: false, pushed, error: `Failed to sync ${item.tableName}` };
        }
        break;
      }
    }

    const status = await getSyncStatus();
    const newCursor = await pullAll(client, opts.userId, status.cursor);
    const now = Date.now();
    await setSyncStatus({
      status: 'idle',
      lastError: null,
      lastPushAt: now,
      lastPullAt: now,
      cursor: newCursor,
    });

    return { ok: true, pushed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[sync] runSync failed', err);
    await setSyncStatus({ status: 'error', lastError: message });
    return { ok: false, pushed: 0, error: message };
  } finally {
    _running = false;
  }
}

/** True when local has no completed workouts and no custom data (candidate for full hydrate). */
export async function isLocalUserDataEmpty(): Promise<boolean> {
  const db = await openDatabase();
  const logs = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM workout_logs WHERE deleted_at IS NULL',
  );
  const customs = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM exercises WHERE is_custom = 1 AND deleted_at IS NULL',
  );
  const templates = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM workout_templates WHERE is_custom = 1 AND deleted_at IS NULL',
  );
  return (logs?.c ?? 0) === 0 && (customs?.c ?? 0) === 0 && (templates?.c ?? 0) === 0;
}
