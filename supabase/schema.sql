-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS exercises (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  body_part TEXT NOT NULL,
  equipment TEXT NOT NULL,
  target_muscle TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  movement_pattern TEXT NOT NULL DEFAULT 'isolation',
  category TEXT NOT NULL DEFAULT 'accessory',
  is_compound BOOLEAN NOT NULL DEFAULT false,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  instructions TEXT[] DEFAULT '{}',
  gif_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_target ON exercises(target_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- Enable Row Level Security (read-only for anon)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read" ON exercises
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated read access
CREATE POLICY "Allow authenticated read" ON exercises
  FOR SELECT
  TO authenticated
  USING (true);
