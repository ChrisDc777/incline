# Agent handoff — read this after `git pull`

Last updated: **2026-08-13** (RPE on working sets).

## Current product state

- **Branch:** `main`
- **Schema version:** 14 (`014_set_rpe` — optional integer RPE 1–10 on `set_entries`)
- **Status:** Pre-alpha; offline-first logger with habit loops + explainable overload coaching (Stage A + Stage B + Stage C RPE slice)

## What was just shipped

Optional RPE after a completed working set ([#98](https://github.com/ChrisDc777/incline/issues/98) slice, covers [#26](https://github.com/ChrisDc777/incline/issues/26)): chips 6–10 (1–5 behind a toggle). Never required; warm-ups skip it. Settings toggle next to warm-up. If the last working set is rated ≥ 9, overload **holds** instead of adding load (`high_rpe_hold`). An unrated last set is ignored (no guessing). Earlier-set ratings do not drive the hold.

Session photos remain local-only. Cloud file sync is [#109](https://github.com/ChrisDc777/incline/issues/109) (blocked by [#57](https://github.com/ChrisDc777/incline/issues/57); needed before public/friends [#78](https://github.com/ChrisDc777/incline/issues/78)).

Full P1/P2 detail: [P1-P2-COACHING.md](./P1-P2-COACHING.md)

| Area | Summary |
|------|---------|
| P1 | Ranked Home context cards, weekly workout goal, announcements pack, credible template suggestions, editable duration, measurement export, calendar streaks/frequency |
| P2 Stage A | Double-progression load suggestions with reason codes |
| P2 Stage B | Fatigue, deload confirm, substitution, expanded muscle insights |
| P2 hygiene | Shared PR kinds; legacy warm-up backfill |
| P1 export / photos | Type-picker export screen; session gym pics on summary |
| P2 Stage C (RPE) | Optional per-set RPE; high-RPE hold on overload |

**Closed issues:** [#41](https://github.com/ChrisDc777/incline/issues/41), [#90](https://github.com/ChrisDc777/incline/issues/90), [#12](https://github.com/ChrisDc777/incline/issues/12), [#97](https://github.com/ChrisDc777/incline/issues/97), [#100](https://github.com/ChrisDc777/incline/issues/100), [#101](https://github.com/ChrisDc777/incline/issues/101), [#95](https://github.com/ChrisDc777/incline/issues/95)

## Recommended next work (priority order)

1. **P0 ops** — [#57](https://github.com/ChrisDc777/incline/issues/57) Supabase sync (multi-device proof; deploy `supabase/sync-schema.sql` incl. `set_type` / `rpe`)
2. **P2 Stage C remainder** — [#98](https://github.com/ChrisDc777/incline/issues/98) readiness check-in + adaptive program-week diffs (RPE is done)
3. **AI layer** — [#99](https://github.com/ChrisDc777/incline/issues/99) Edge Function `coach-narrate` (only after #57 proven)

Optional later: [#94](https://github.com/ChrisDc777/incline/issues/94) measurement goals (keep open, do not build now), [#23](https://github.com/ChrisDc777/incline/issues/23) side-by-side progress photos, [#109](https://github.com/ChrisDc777/incline/issues/109) photo cloud sync.

## Key code paths

```
src/coaching/                    # Rules: overload, fatigue, deload, substitution, insights, PR, RPE
src/coaching/rpe.ts              # normalize + average-if-complete
src/components/workout/rpe-chips.tsx
src/db/migrations/014_set_rpe.ts
src/coaching/pr.ts               # Shared PR kinds + fold
src/app/(app)/export.tsx         # Choose types + range + CSV/JSON
src/components/workout/session-photo-strip.tsx
src/db/queries/photos.ts         # Local session photos (not synced)
src/lib/consistency.ts           # Day/week streaks + month/year frequency
src/app/(app)/calendar.tsx       # Heatmap, streaks, tap-a-day
src/lib/home-context.ts          # Home card ranking
src/db/queries/coaching/         # Template/exercise suggestions + substitutes
src/lib/announcements/           # Static promo pack
src/components/home/             # HomeContextCard UI
```

## Architecture constraints (do not break)

- Auth is **Clerk** (JWT template `supabase` for cloud). Do not reintroduce Supabase Auth.
- SQLite + outbox = source of truth; coaching is **recomputed**, not synced
- Rules own load/reps; LLM (later) may only narrate — never invent numbers
- Session logging must never await network or AI
- Read [ROADMAP.md](../ROADMAP.md) milestone notes before adding backend scope

## Verify locally

```bash
npm run typecheck
npm run test
```

## GitHub milestones

| Milestone | Focus |
|-----------|--------|
| [P0](https://github.com/ChrisDc777/incline/milestone/1) | Sync ops, trust |
| [P1](https://github.com/ChrisDc777/incline/milestone/2) | Habit loops (mostly done) |
| [P2](https://github.com/ChrisDc777/incline/milestone/3) | Coaching — Stage A+B done; C RPE shipped, remainder in #98–#99 |
| [P3+](https://github.com/ChrisDc777/incline/milestone/4) | Social, Health/Fit — after P0 |

## USP (product north star)

**Explainable progressive overload coach** — offline-first, cites your history, suggests next load with reasons.
