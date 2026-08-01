/**
 * Backfill missing exercise GIFs from ExerciseGymGifsDB.
 * Fetches the free GIF database and matches exercises by name, then updates Supabase.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/backfill-gifs.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GIF_DB_URL = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json';

/** Normalize a name for fuzzy matching: lowercase, strip common prefixes/suffixes, collapse spaces. */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip equipment prefixes for matching core exercise name. */
function stripEquipment(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(lever|cable|machine|smith|barbell|dumbbell|band|bodyweight|weighted|assisted|seated|standing|lying|incline|decline|flat|bar|rope|EZ|resistance)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Check if two normalized names match. Requires the stripped versions to be identical OR at least 70% word overlap. */
function namesMatch(ourName, gifName) {
  const a = normalize(ourName);
  const b = normalize(gifName);
  if (a === b) return true;

  const sa = stripEquipment(ourName);
  const sb = stripEquipment(gifName);
  if (sa === sb && sa.length > 3) return true;

  // Word overlap check: at least 70% of words from our name must appear in the gif name
  const ourWords = sa.split(' ').filter(w => w.length > 2);
  const gifWords = new Set(sb.split(' '));
  if (ourWords.length === 0) return false;
  const matched = ourWords.filter(w => gifWords.has(w)).length;
  return matched / ourWords.length >= 0.7;
}

async function main() {
  console.log('Fetching ExerciseGymGifsDB...');
  const res = await fetch(GIF_DB_URL);
  if (!res.ok) throw new Error(`Failed to fetch GIF DB: ${res.status}`);
  const gifData = await res.json();
  const gifExercises = gifData.exercises || [];
  console.log(`Loaded ${gifExercises.length} exercises from GIF database`);

  // Build lookup: normalized name -> gifUrl
  const gifLookup = new Map();
  for (const ex of gifExercises) {
    const key = normalize(ex.name);
    gifLookup.set(key, ex.gifUrl);
  }

  // Fetch exercises from Supabase that are missing gif_url (null or empty string)
  console.log('Fetching exercises from Supabase...');
  let allSupabase = [];
  let offset = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, gif_url')
      .or('gif_url.is.null,gif_url.eq.')
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allSupabase.push(...data);
    if (data.length < PAGE) break;
    offset += data.length;
  }
  console.log(`Found ${allSupabase.length} exercises without GIF in Supabase`);

  let matched = 0;
  let updated = 0;
  let missed = [];

  for (const ex of allSupabase) {
    // Try exact normalized name match first
    let gifUrl = gifLookup.get(normalize(ex.name));

    // Try fuzzy name match against all GIF exercises
    if (!gifUrl) {
      for (const gifEx of gifExercises) {
        if (namesMatch(ex.name, gifEx.name)) {
          gifUrl = gifEx.gifUrl;
          break;
        }
      }
    }

    if (gifUrl) {
      matched++;
      const { error } = await supabase
        .from('exercises')
        .update({ gif_url: gifUrl })
        .eq('id', ex.id);
      if (error) {
        console.error(`  Failed to update ${ex.name}: ${error.message}`);
      } else {
        updated++;
        console.log(`  ✓ ${ex.name} → ${gifUrl.split('/').pop()}`);
      }
    } else {
      missed.push(ex.name);
    }
  }

  console.log(`\nDone! Matched: ${matched}, Updated: ${updated}, Missed: ${missed.length}`);
  if (missed.length > 0) {
    console.log(`\nMissed exercises:`);
    missed.forEach((n) => console.log(`  - ${n}`));
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
