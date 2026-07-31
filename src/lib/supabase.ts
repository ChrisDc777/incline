import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'your_supabase_url');

export const supabase = supabaseReady
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;

/* ---- Types ---- */

export interface SupabaseExercise {
  id: number;
  external_id: string;
  name: string;
  body_part: string;
  equipment: string;
  target_muscle: string;
  secondary_muscles: string[];
  movement_pattern: string;
  category: string;
  is_compound: boolean;
  difficulty: string;
  instructions: string[];
  gif_url: string;
  created_at: string;
}

/* ---- Queries ---- */

export async function fetchExercisesFromSupabase(limit = 50, offset = 0): Promise<SupabaseExercise[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function searchExercisesFromSupabase(query: string, limit = 50): Promise<SupabaseExercise[]> {
  if (!supabase) return [];
  const q = query.toLowerCase().trim();
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`name.ilike.%${q}%,body_part.ilike.%${q}%,target_muscle.ilike.%${q}%,equipment.ilike.%${q}%`)
    .order('name')
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getExerciseCount(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}
