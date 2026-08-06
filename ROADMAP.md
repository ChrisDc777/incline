# Incline — Roadmap

Status: **pre-alpha**. The core loop (onboarding → log → finish → progress) is implemented and local-first. Items below are intentionally **not implemented yet**; the architecture leaves clear extension points for them.

## Data & infrastructure
- ~~Incremental, idempotent database migrations~~ — **done** (`src/db/migrations/` runner + `schema_meta.version`).
- ~~Split `db/queries` by domain~~ — **done** (`src/db/queries/` modules + barrel `index.ts`).
- ~~Account binding~~ — **done** (`schema_meta.owner_user_id` via `src/db/account.ts`; account switch clears local user data).
- **Materialized / cached workout statistics & PR calculations.** `getProgressStats` computes aggregates live; for large datasets, add a `stats_cache` table or incremental triggers.
- **Full-text search (SQLite FTS5).** Enable the `expo-sqlite` `enableFTS` config plugin + a trigram tokenizer once we move to custom dev builds (it requires a native rebuild and breaks Expo Go). The current `LIKE` + fuzzy ranker covers the MVP catalog.

## Sync & accounts
- ~~Email/password auth~~ — **done** (Clerk).
- ~~Cloud sync foundation~~ — **done** (local UUIDs / soft deletes / outbox; Supabase user tables + RLS in `supabase/sync-schema.sql`; sync engine in `src/sync/`).
- **Operationalize sync** — run `supabase/sync-schema.sql`, configure Clerk JWT template `supabase` + Supabase third-party auth, verify multi-device backup/restore.
- **Tombstone GC** — Edge Function / cron to hard-delete rows with `deleted_at` older than 90 days (see comments in sync-schema).
- **Stronger conflict resolution** — field-level LWW or merge when concurrent multi-device logging is a product goal.

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
- **Snapshot/interaction tests** for the component library and more `queries/` coverage (calc + migration fixtures exist under `src/db/__tests__`).
- **E2E** for the core journey (onboarding → start → log → finish → progress).
