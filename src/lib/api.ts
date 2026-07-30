import { EXERCISEDB_API_KEY, EXERCISEDB_API_HOST } from './env';

/* ---- Free tier types ---- */

export interface FreeApiExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface FreeApiMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
}

interface FreeApiListResponse {
  success: boolean;
  meta: FreeApiMeta;
  data: FreeApiExercise[];
}

/* ---- Unified internal type ---- */

export interface ExerciseDbExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

/* ---- Free tier API (no key required) ---- */

const FREE_BASE = 'https://oss.exercisedb.dev/api/v1';

async function freeFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${FREE_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`ExerciseDB free API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function mapFreeExercise(ex: FreeApiExercise): ExerciseDbExercise {
  return {
    id: ex.exerciseId,
    name: ex.name,
    bodyPart: ex.bodyParts[0] ?? 'unknown',
    equipment: ex.equipments[0] ?? 'bodyweight',
    gifUrl: ex.gifUrl,
    target: ex.targetMuscles[0] ?? 'unknown',
    secondaryMuscles: ex.secondaryMuscles,
    instructions: ex.instructions.map((s) => s.replace(/^Step:\d+\s*/, '')),
  };
}

/* ---- Paid tier API (RapidAPI) ---- */

function hasPaidKey(): boolean {
  return !!EXERCISEDB_API_KEY;
}

async function paidFetch<T>(path: string): Promise<T> {
  if (!EXERCISEDB_API_KEY) {
    throw new Error('ExerciseDB API key not configured');
  }
  const host = EXERCISEDB_API_HOST || 'exercisedb.p.rapidapi.com';
  const response = await fetch(`https://${host}${path}`, {
    headers: {
      'X-RapidAPI-Key': EXERCISEDB_API_KEY,
      'X-RapidAPI-Host': EXERCISEDB_API_HOST,
    },
  });
  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/* ---- Public methods (auto-selects free or paid) ---- */

export async function fetchExercises(limit = 50, offset = 0): Promise<ExerciseDbExercise[]> {
  if (hasPaidKey()) {
    const data = await paidFetch<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl: string; target: string; secondaryMuscles: string[]; instructions: string[] }[]>(
      `/exercises?limit=${limit}&offset=${offset}`,
    );
    return data.map((ex) => ({
      id: ex.id,
      name: ex.name,
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      gifUrl: ex.gifUrl,
      target: ex.target,
      secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions.map((s) => s.replace(/^Step:\d+\s*/, '')),
    }));
  }

  // Free tier: cursor-based pagination
  const resp = await freeFetch<FreeApiListResponse>(`/exercises?limit=${limit}&offset=${offset}`);
  return resp.data.map(mapFreeExercise);
}

export async function fetchExerciseCount(): Promise<number> {
  if (hasPaidKey()) {
    const data = await paidFetch<{ id: string }[]>('/exercises?limit=1&offset=0');
    return Array.isArray(data) ? data.length : 0;
  }
  const resp = await freeFetch<FreeApiListResponse>('/exercises?limit=1&offset=0');
  return resp.meta.total;
}

export async function fetchExercisesByBodyPart(bodyPart: string): Promise<ExerciseDbExercise[]> {
  if (hasPaidKey()) {
    const data = await paidFetch<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl: string; target: string; secondaryMuscles: string[]; instructions: string[] }[]>(
      `/exercises/bodyPart/${bodyPart}`,
    );
    return data.map((ex) => ({
      id: ex.id, name: ex.name, bodyPart: ex.bodyPart, equipment: ex.equipment,
      gifUrl: ex.gifUrl, target: ex.target, secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions.map((s) => s.replace(/^Step:\d+\s*/, '')),
    }));
  }
  const resp = await freeFetch<FreeApiListResponse>(`/exercises/bodyPart/${bodyPart}`);
  return resp.data.map(mapFreeExercise);
}

export async function fetchExercisesByMuscle(target: string): Promise<ExerciseDbExercise[]> {
  if (hasPaidKey()) {
    const data = await paidFetch<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl: string; target: string; secondaryMuscles: string[]; instructions: string[] }[]>(
      `/exercises/target/${target}`,
    );
    return data.map((ex) => ({
      id: ex.id, name: ex.name, bodyPart: ex.bodyPart, equipment: ex.equipment,
      gifUrl: ex.gifUrl, target: ex.target, secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions.map((s) => s.replace(/^Step:\d+\s*/, '')),
    }));
  }
  const resp = await freeFetch<FreeApiListResponse>(`/exercises/target/${target}`);
  return resp.data.map(mapFreeExercise);
}

export async function fetchExercisesByEquipment(equipment: string): Promise<ExerciseDbExercise[]> {
  if (hasPaidKey()) {
    const data = await paidFetch<{ id: string; name: string; bodyPart: string; equipment: string; gifUrl: string; target: string; secondaryMuscles: string[]; instructions: string[] }[]>(
      `/exercises/equipment/${equipment}`,
    );
    return data.map((ex) => ({
      id: ex.id, name: ex.name, bodyPart: ex.bodyPart, equipment: ex.equipment,
      gifUrl: ex.gifUrl, target: ex.target, secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions.map((s) => s.replace(/^Step:\d+\s*/, '')),
    }));
  }
  const resp = await freeFetch<FreeApiListResponse>(`/exercises/equipment/${equipment}`);
  return resp.data.map(mapFreeExercise);
}

export async function fetchBodyParts(): Promise<string[]> {
  if (hasPaidKey()) {
    return paidFetch<string[]>('/bodyPartList');
  }
  return freeFetch<string[]>('/bodyPartList');
}

export async function fetchMuscles(): Promise<string[]> {
  if (hasPaidKey()) {
    return paidFetch<string[]>('/targetList');
  }
  return freeFetch<string[]>('/targetList');
}

export async function fetchEquipmentList(): Promise<string[]> {
  if (hasPaidKey()) {
    return paidFetch<string[]>('/equipmentList');
  }
  return freeFetch<string[]>('/equipmentList');
}
