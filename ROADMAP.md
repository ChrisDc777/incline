# Incline — Roadmap

Status: **pre-alpha**. The core loop (onboarding → log → finish → progress) is implemented and local-first. Items below are intentionally **not implemented yet**; the architecture leaves clear extension points for them.

## Data & infrastructure
- **Incremental, idempotent database migrations.** Today `client.ts` runs idempotent `CREATE TABLE IF NOT EXISTS` statements and tracks `schema_meta.version`. Replace with an ordered migration runner (`migrations/0001_init.sql`, …) before schema changes ship.
- **Materialized / cached workout statistics & PR calculations.** `getProgressStats` computes aggregates live; for large datasets, add a `stats_cache` table or incremental triggers.
- **Full-text search (SQLite FTS5).** Enable the `expo-sqlite` `enableFTS` config plugin + a trigram tokenizer once we move to custom dev builds (it requires a native rebuild and breaks Expo Go). The current `LIKE` + fuzzy ranker covers the MVP catalog.

## Sync & accounts
- ~~Email/password auth~~ — **done** (Clerk).
- **Cloud sync** of `workout_logs` / `set_entries` / `user_profile`. `updated_at` is already on every row and `set_entries` is normalized, so sync diffs are feasible. `db/queries.ts` is the single swap point for a remote-backed implementation.
- **Offline sync conflict resolution & optimistic updates** (last-write-wins or CRDT-style per set).

## Product features
- **Program builder** — create/edit multi-week programs and assign template workouts to day slots (tracked in issue #65). Programs are currently view-only informational cards.
- **Workout notifications** — system-level reminders. (In-session rest-timer completion sound is already implemented.)
- **Wearable integrations** — Apple Health / Google Fit (read workouts, write sessions, bodyweight).
- **AI-powered workout recommendations** — suggest next session, auto-regulate load from recent logs (carry-over data already exists via `getLastSetsForExercise`).
- **Advanced analytics** — volume/intensity trends, fatigue, deload suggestions, exercise substitution.
- **Exercise & template authoring** — user-created exercises/templates/programs (schema already supports it).
- **Custom branding / icon** and a proper splash animation. (Splash is configured with the app glyph; store-ready assets still needed.)

## Engineering
- **Lint / typecheck baseline** — configured (`npm run lint`, `npm run typecheck`); one pre-existing `env.ts` lint error to clean up.
- **Snapshot/interaction tests** for the component library and `queries.ts` (with an in-memory SQLite fixture).
- **E2E** for the core journey (onboarding → start → log → finish → progress).
