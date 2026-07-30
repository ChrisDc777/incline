import { EXERCISEDB_API_KEY, EXERCISEDB_API_HOST } from './env';

const BASE_URL = `https://${EXERCISEDB_API_HOST}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Typed fetch wrapper for ExerciseDB (RapidAPI).
 * Adds the required headers, handles errors, and returns parsed JSON.
 */
export async function exerciseDbFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!EXERCISEDB_API_KEY) {
    throw new Error(
      'ExerciseDB API key not configured. Add EXPO_PUBLIC_EXERCISEDB_API_KEY to .env.local',
    );
  }

  const url = `${BASE_URL}${path}`;
  const headers = {
    'X-RapidAPI-Key': EXERCISEDB_API_KEY,
    'X-RapidAPI-Host': EXERCISEDB_API_HOST,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      `ExerciseDB API error: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  return response.json() as Promise<T>;
}

/* ---- ExerciseDB response types ---- */

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

export interface ExerciseDbMuscle {
  id: string;
  name: string;
  bodyPart: string;
}

export interface ExerciseDbEquipment {
  id: string;
  name: string;
}

export interface ExerciseDbBodyPart {
  id: string;
  name: string;
}

/* ---- ExerciseDB API methods ---- */

export async function fetchExercises(limit = 50, offset = 0): Promise<ExerciseDbExercise[]> {
  return exerciseDbFetch<ExerciseDbExercise[]>(
    `/exercises?limit=${limit}&offset=${offset}`,
  );
}

export async function fetchExerciseById(id: string): Promise<ExerciseDbExercise> {
  return exerciseDbFetch<ExerciseDbExercise>(`/exercises/${id}`);
}

export async function fetchExercisesByBodyPart(bodyPart: string): Promise<ExerciseDbExercise[]> {
  return exerciseDbFetch<ExerciseDbExercise[]>(`/exercises/bodyPart/${bodyPart}`);
}

export async function fetchExercisesByMuscle(target: string): Promise<ExerciseDbExercise[]> {
  return exerciseDbFetch<ExerciseDbExercise[]>(`/exercises/target/${target}`);
}

export async function fetchExercisesByEquipment(equipment: string): Promise<ExerciseDbExercise[]> {
  return exerciseDbFetch<ExerciseDbExercise[]>(`/exercises/equipment/${equipment}`);
}

export async function fetchBodyParts(): Promise<ExerciseDbBodyPart[]> {
  return exerciseDbFetch<ExerciseDbBodyPart[]>('/bodyPartList');
}

export async function fetchMuscles(): Promise<ExerciseDbMuscle[]> {
  return exerciseDbFetch<ExerciseDbMuscle[]>('/targetList');
}

export async function fetchEquipmentList(): Promise<ExerciseDbEquipment[]> {
  return exerciseDbFetch<ExerciseDbEquipment[]>('/equipmentList');
}
