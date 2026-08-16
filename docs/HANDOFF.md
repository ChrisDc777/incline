# Agent handoff — read this after `git pull`

Last updated: **2026-08-16** (Stage C readiness + program-week diffs).

## Current product state

- **Branch:** `main`
- **Schema version:** 14 (`014_set_rpe`)
- **Status:** Pre-alpha; offline-first logger with Stage A–C coaching (RPE, readiness, user-confirmed program diffs)

## What was just shipped

Stage C remainder ([#98](https://github.com/ChrisDc777/incline/issues/98)):
- Home readiness check-in (Fresh / OK / Tired). Only **Tired** softens overload suggestions for the day (kv, device-first).
- User-confirmed program-week diffs: catch up a missed day onto the next open slot, or insert a lighter deload day — confirm screen at `/(app)/program-adjust`. Never writes the plan until Confirm.

Account switch wipe + profile hydrate ([#111](https://github.com/ChrisDc777/incline/pull/111)) is on main. Core sync (workouts + profile) is good enough; remaining sync gaps stay as milestone follow-ups on [#57](https://github.com/ChrisDc777/incline/issues/57).

## Recommended next work (priority order)

1. **AI layer** — [#99](https://github.com/ChrisDc777/incline/issues/99) Edge Function `coach-narrate` (sync is trusted enough)
2. **[#23](https://github.com/ChrisDc777/incline/issues/23)** — side-by-side progress photos
3. **[#109](https://github.com/ChrisDc777/incline/issues/109)** — photo Storage (before public/friends [#78](https://github.com/ChrisDc777/incline/issues/78))

Later: [#112](https://github.com/ChrisDc777/incline/issues/112) native Google sheet (P4), [#94](https://github.com/ChrisDc777/incline/issues/94) measurement goals, #57 follow-ups (programs/settings sync).

## Key code paths

```
src/coaching/readiness.ts          # Tired → softer loads
src/coaching/readiness-store.ts    # Daily kv check-in
src/coaching/program-plan.ts       # Catch-up / deload-insert detection
src/app/(app)/program-adjust.tsx   # Confirm / snooze
src/components/home/readiness-checkin.tsx
src/coaching/rpe.ts
src/sync/engine.ts                 # Profile hydrate on empty local
```

## Architecture constraints (do not break)

- Auth is **Clerk** (JWT template `supabase` for cloud). Do not reintroduce Supabase Auth.
- SQLite + outbox = source of truth; coaching is **recomputed**, not synced
- Rules own load/reps; LLM (later) may only narrate — never invent numbers
- Session logging must never await network or AI
- Program / readiness changes never silent-write without confirm (except optional readiness chips)

## Verify locally

```bash
npm run typecheck
npm run test
```

## USP (product north star)

**Explainable progressive overload coach** — offline-first, cites your history, suggests next load with reasons.
