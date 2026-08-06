/**
 * Authenticated Supabase client for user-data sync.
 *
 * Catalog reads continue to use the anon client in `supabase.ts`.
 * Sync mutations attach the Clerk session JWT so RLS (`auth.jwt()->>'sub'`)
 * matches `schema_meta.owner_user_id`.
 *
 * Setup (dashboard):
 * 1. Clerk → JWT templates → create "supabase" with `aud: "authenticated"`.
 * 2. Supabase → Authentication → Third-party / JWT → add Clerk JWKS URL.
 * 3. Or use Clerk's native Supabase integration.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

export type GetToken = (options?: { template?: string }) => Promise<string | null>;

let _authed: SupabaseClient | null = null;
let _token: string | null = null;

export function syncBackendReady(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'your_supabase_url');
}

/**
 * Returns a Supabase client whose Authorization header uses the Clerk JWT.
 * Prefer template name `supabase` when configured; falls back to the default session token.
 */
export async function getAuthedSupabase(getToken: GetToken): Promise<SupabaseClient | null> {
  if (!syncBackendReady()) return null;

  let token: string | null = null;
  try {
    token = await getToken({ template: 'supabase' });
  } catch {
    token = null;
  }
  if (!token) {
    try {
      token = await getToken();
    } catch {
      return null;
    }
  }
  if (!token) return null;

  if (_authed && _token === token) return _authed;

  _token = token;
  _authed = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _authed;
}

export function clearAuthedSupabase(): void {
  _authed = null;
  _token = null;
}
