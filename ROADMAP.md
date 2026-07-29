# Incline — Roadmap

The MVP delivers a polished end-to-end workout tracking experience. The items below are intentionally **not implemented yet** — the architecture leaves clear extension points for them.

## Data & infrastructure
- **Incremental, idempotent database migrations.** Today `client.ts` runs idempotent `CREATE TABLE IF NOT EXISTS` statements and tracks `schema_meta.version`. Replace with a ordered migration runner (`migrations/0001_init.sql`, …) before schema changes ship.
- **Materialized / cached workout statistics & PR calculations.** `getProgressStats` computes aggregates live; for large datasets, add a `stats_cache` table or incremental triggers.
- **Full-text search (SQLite FTS5).** Enable the `expo-sqlite` `enableFTS` config plugin + a trigram tokenizer once we move to custom dev builds (it requires a native rebuild and breaks Expo Go). The current `LIKE` + fuzzy ranker covers the MVP catalog.

## Sync & accounts
- **Authentication** (email/OAuth/Passkeys).
- **Cloud sync** of `workout_logs` / `set_entries` / `user_profile`. `updated_at` is already on every row and `set_entries` is normalized, so sync diffs are feasible. `db/queries.ts` is the single swap point for a remote-backed implementation.
- **Offline sync conflict resolution & optimistic updates** (last-write-wins or CRDT-style per set).

## Product features
- **Program builder & program detail** (week/day grid, progression rules). Programs are currently informational cards.
- **Workout notifications & configurable rest-timer sounds.**
- **Wearable integrations** — Apple Health / Google Fit (read workouts, write sessions, bodyweight).
- **AI-powered workout recommendations** — suggest next session, auto-regulate load from recent logs (carry-over data already exists via `getLastSetsForExercise`).
- **Advanced analytics** — volume/intensity trends, fatigue, deload suggestions, exercise substitution.
- **Exercise & template authoring** — user-created exercises/templates/programs (schema already supports it).
- **Custom branding / icon** and a proper splash animation.

## Engineering
- **Lint** (`expo lint`) + formatting baseline.
- **Snapshot/interaction tests** for the component library and `queries.ts` (with an in-memory SQLite fixture).
- **E2E** for the core journey (onboarding → start → log → finish → progress).
