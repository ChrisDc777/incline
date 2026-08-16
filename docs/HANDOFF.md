# Agent handoff — read this after `git pull`

Last updated: **2026-08-17** (#23 progress photo comparison).

## Current product state

- **Branch:** `main`
- **Schema version:** 14 (`014_set_rpe`)
- **Status:** Pre-alpha; offline-first logger with Stage A–C coaching; local progress photo compare

## What was just shipped

[#23](https://github.com/ChrisDc777/incline/issues/23) week-vs-week comparison of **existing** session photos (local files only):
- Progress tab → Photos screen (earliest vs latest by default)
- Week labels respect Mon/Sun `weekStartsOn`
- Picker sheet + confirmed delete; capture stays on workout summary
- Cloud backup remains [#109](https://github.com/ChrisDc777/incline/issues/109)

Quality gate + CI ([#114](https://github.com/ChrisDc777/incline/pull/114)) is on main.

## Recommended next work (priority order)

1. **AI layer** — [#99](https://github.com/ChrisDc777/incline/issues/99) Edge Function `coach-narrate`
2. **[#109](https://github.com/ChrisDc777/incline/issues/109)** — photo Storage (before public/friends [#78](https://github.com/ChrisDc777/incline/issues/78))

Later: [#112](https://github.com/ChrisDc777/incline/issues/112) native Google sheet (P4), [#94](https://github.com/ChrisDc777/incline/issues/94) measurement goals, #57 follow-ups.

## Key code paths

```
src/app/(app)/progress-photos.tsx
src/components/progress/photo-compare.tsx
src/components/progress/photo-picker-sheet.tsx
src/db/queries/photos.ts
src/lib/progress-photos.ts
src/hooks/use-home-coaching-context.ts
src/coaching/program-plan.ts
src/sync/engine.ts
```

## Architecture constraints (do not break)

- Auth is **Clerk** (JWT template `supabase` for cloud). Do not reintroduce Supabase Auth.
- SQLite + outbox = source of truth; coaching is **recomputed**, not synced
- Rules own load/reps; LLM (later) may only narrate — never invent numbers
- Session logging must never await network or AI
- Photos stay on-device until #109; comparison must not block on network

## Verify locally

```bash
npm run typecheck
npm run lint
npm run test
```

CI runs the same checks on push/PR to `main` (`.github/workflows/ci.yml`).

## USP (product north star)

**Explainable progressive overload coach** — offline-first, cites your history, suggests next load with reasons.
