# Agent handoff — read this after `git pull`

Last updated: **2026-08-12** (P1 closeout + P2 Stage A coaching merged; stale `AUTH_AND_API_PLAN.md` removed).

## Current product state

- **Branch:** `main`
- **Schema version:** 11 (`011_set_type` — warm-up vs working sets)
- **Status:** Pre-alpha; offline-first logger with habit loops + explainable overload coaching (Stage A)

## What was just shipped

Full detail: [P1-P2-COACHING.md](./P1-P2-COACHING.md)

| Area | Summary |
|------|---------|
| P1 | Ranked Home context cards, weekly workout goal, announcements pack, credible template suggestions, editable duration, measurement export |
| P2 Stage A | `src/coaching/` — double-progression load suggestions with reason codes on workout preview, session, summary, Home |

**Closed issues:** [#41](https://github.com/ChrisDc777/incline/issues/41), [#90](https://github.com/ChrisDc777/incline/issues/90)

## Recommended next work (priority order)

1. **P0 ops** — [#57](https://github.com/ChrisDc777/incline/issues/57) Supabase sync (multi-device proof; deploy `supabase/sync-schema.sql` incl. `set_type` / `superset_group`)
2. **P1 remainder** — [#12](https://github.com/ChrisDc777/incline/issues/12) day streak / yearly frequency (weekly goal + best streak shipped)
3. **P2 Stage B** — [#97](https://github.com/ChrisDc777/incline/issues/97) fatigue, deload, substitution, expanded insights
4. **P2 hygiene** — [#100](https://github.com/ChrisDc777/incline/issues/100) unify PR semantics; [#101](https://github.com/ChrisDc777/incline/issues/101) warm-up backfill
5. **P2 Stage C** — [#98](https://github.com/ChrisDc777/incline/issues/98) RPE, readiness, adaptive program diffs
6. **AI layer** — [#99](https://github.com/ChrisDc777/incline/issues/99) Edge Function `coach-narrate` (only after #57 proven)

Optional P1: [#94](https://github.com/ChrisDc777/incline/issues/94) measurement goals, [#95](https://github.com/ChrisDc777/incline/issues/95) export polish, [#23](https://github.com/ChrisDc777/incline/issues/23) progress photos.

## Key code paths

```
src/lib/home-context.ts          # Home card ranking
src/coaching/                    # Rules engine (overload, insights)
src/db/queries/coaching/         # Template/exercise suggestions
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
| [P2](https://github.com/ChrisDc777/incline/milestone/3) | Coaching — Stage A done; B/C in #97–#99 |
| [P3+](https://github.com/ChrisDc777/incline/milestone/4) | Social, Health/Fit — after P0 |

## USP (product north star)

**Explainable progressive overload coach** — offline-first, cites your history, suggests next load with reasons.
