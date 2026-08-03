/**
 * Typed environment variable reader. All EXPO_PUBLIC_* vars are inlined
 * by Metro at build time — this module validates them at runtime so we
 * fail fast with a clear message instead of undefined-at-use-time bugs.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Add it to .env.local (see .env.example for the list).`,
    );
  }
  return value;
}

function optionalEnv(value: string | undefined, fallback = ''): string {
  return value ?? fallback;
}

/* ---- Clerk (required) ---- */
export const CLERK_PUBLISHABLE_KEY = requireEnv(
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

/* ---- ExerciseDB (RapidAPI, optional — free tier needs neither) ---- */
export const EXERCISEDB_API_KEY = optionalEnv(process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY);
export const EXERCISEDB_API_HOST = optionalEnv(process.env.EXPO_PUBLIC_EXERCISEDB_API_HOST);

/* ---- Supabase (required for exercise library) ---- */
export const SUPABASE_URL = optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
