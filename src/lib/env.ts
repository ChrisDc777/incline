/**
 * Typed environment variable reader. All EXPO_PUBLIC_* vars are inlined
 * by Metro at build time — this module validates them at runtime so we
 * fail fast with a clear message instead of undefined-at-use-time bugs.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        `Add it to .env.local (see .env.example for the list).`,
    );
  }
  return value;
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

/* ---- Clerk ---- */
export const CLERK_PUBLISHABLE_KEY = requireEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');

/* ---- ExerciseDB (RapidAPI) ---- */
export const EXERCISEDB_API_KEY = optionalEnv('EXPO_PUBLIC_EXERCISEDB_API_KEY');
export const EXERCISEDB_API_HOST = optionalEnv('EXPO_PUBLIC_EXERCISEDB_API_HOST', 'exercisedb.p.rapidapi.com');
