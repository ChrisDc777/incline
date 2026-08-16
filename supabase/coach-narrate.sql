-- Coach narration cache + per-user rate limit for Edge Function `coach-narrate`.
-- Run in the Supabase SQL editor after sync-schema.sql.
-- Writes go through the function (service role). Clients may SELECT their own cache rows.

CREATE TABLE IF NOT EXISTS coach_narration_cache (
  user_id TEXT NOT NULL,
  pack_hash TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  surface TEXT NOT NULL,
  narration JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_hash, prompt_version, surface)
);

CREATE TABLE IF NOT EXISTS coach_narrate_rate (
  user_id TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE coach_narration_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_narrate_rate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_narration_cache_select_own" ON coach_narration_cache;
CREATE POLICY "coach_narration_cache_select_own"
  ON coach_narration_cache
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));

-- Rate table is service-role only (no policies for anon/authenticated).
REVOKE ALL ON TABLE coach_narrate_rate FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coach_narrate_rate TO service_role;

GRANT SELECT ON TABLE coach_narration_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coach_narration_cache TO service_role;
