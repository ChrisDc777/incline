# Incline — Roadmap

Status: **pre-alpha**. Core loop (onboarding → log → finish → progress) is local-first and working.

Tracking lives in **GitHub milestones** (architecture notes are on each milestone description):

| Milestone | Intent |
|-----------|--------|
| [P0 — Complete & trustworthy](https://github.com/ChrisDc777/incline/milestone/1) | Sync ops, export, reminders, finish moment, history filters |
| [P1 — Habit loops](https://github.com/ChrisDc777/incline/milestone/2) | Home context, supersets, measurements, motion polish |
| [P2 — Coaching & intelligence](https://github.com/ChrisDc777/incline/milestone/3) | Overload, insights, AI Edge Functions, analytics |
| [P3 — Social & platform growth](https://github.com/ChrisDc777/incline/milestone/4) | Friends/public workouts, marketplace, Health/Fit |
| [P4 — Target architecture](https://github.com/ChrisDc777/incline/milestone/5) | Deferred: GC, conflicts, API boundary, sync protocol evolution — [#83](https://github.com/ChrisDc777/incline/issues/83) |

**Prioritize P0.** Do not over-build P4 patterns until P0 sync is proven with real multi-device use.

## Done (foundation)

- Incremental migrations (`src/db/migrations/`), domain queries, account binding
- Clerk auth + password reset
- Cloud **sync foundation** (UUIDs, outbox, `src/sync/`, `supabase/sync-schema.sql`) — **ops still P0 (#57)**
- Program builder (local); share card; milestones; calendar heat/year; rest OS alerts; PR assist; template duplicate/notes

## Sync model (keep)

- Offline-first SQLite → outbox → Supabase RLS (`user_id` = Clerk `sub`)
- Opportunistic push/pull on foreground + Settings “Backup & restore” (`syncNow`)
- Not a dated backup product; file export is separate (#6)
- Sharing/social ≠ personal sync (visibility tables later; never disable RLS for “public”)

## Explicitly later (see P4 / #83)

- Tombstone GC, stronger than LWW conflicts, SyncClient extraction, thin domain API/workers
- Programs + settings in sync protocol (same outbox pattern)
- stats_cache / FTS5 at scale
- Wearables, marketplace, full AI control plane

## Engineering hygiene

- Lint / typecheck baseline; expand query tests; E2E for core journey when P0 stabilizes
