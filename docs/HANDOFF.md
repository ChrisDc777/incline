# Agent handoff — read this after `git pull`

Last updated: **2026-08-17** (#99 coach-narrate + #23 photo compare).

## Current product state

- **Branch:** `main`
- **Schema version:** 14 (`014_set_rpe`)
- **Status:** Pre-alpha; offline-first logger with Stage A–C coaching; local photo compare; optional AI wording (deploy required)

## What was just shipped

### [#99](https://github.com/ChrisDc777/incline/issues/99) coach-narrate
- Settings **AI explanations** default **off**; rules still own every number
- Client builds hashed `FeaturePackV1`; function never reads `workout_logs` for the prompt
- Summary / Home idle only — **session logging never awaits AI**
- Stub mode when `COACH_NARRATE_STUB=1` or `OPENAI_API_KEY` missing
- **Deploy:** run `supabase/coach-narrate.sql`, deploy function, set secrets (`OPENAI_API_KEY`, optional model/stub, Clerk JWKS / `CLERK_JWKS_URL`)

### [#23](https://github.com/ChrisDc777/incline/issues/23) progress photos
- Progress tab → Photos screen (earliest vs latest); Mon/Sun week labels
- Capture stays on workout summary; files stay on-device until [#109](https://github.com/ChrisDc777/incline/issues/109)

Also on main: FeaturePack [#115](https://github.com/ChrisDc777/incline/pull/115), quality gate + CI [#114](https://github.com/ChrisDc777/incline/pull/114), photos [#116](https://github.com/ChrisDc777/incline/pull/116).

## Recommended next work (priority order)

1. **Deploy #99** — SQL + function + secrets; smoke stub then live model
2. **[#109](https://github.com/ChrisDc777/incline/issues/109)** — photo Storage (before public/friends [#78](https://github.com/ChrisDc777/incline/issues/78))

Later: [#112](https://github.com/ChrisDc777/incline/issues/112) native Google sheet (P4), [#94](https://github.com/ChrisDc777/incline/issues/94) measurement goals, #57 follow-ups.

## Key code paths

```
src/coaching/feature-pack.ts
src/coaching/narrate-client.ts
supabase/functions/coach-narrate
src/app/(app)/progress-photos.tsx
src/components/progress/photo-compare.tsx
src/db/queries/photos.ts
src/hooks/use-home-coaching-context.ts
src/sync/engine.ts
```

## Architecture constraints (do not break)

- Auth is **Clerk** (JWT template `supabase` for cloud). Do not reintroduce Supabase Auth.
- SQLite + outbox = source of truth; coaching is **recomputed**, not synced
- Rules own load/reps; LLM may only narrate — never invent numbers
- Session logging must never await network or AI
- Photos stay on-device until #109; comparison must not block on network

## Verify locally

```bash
npm run typecheck
npm run lint
npm run test
```

CI runs the same checks on push/PR to `main` (`.github/workflows/ci.yml`).

## Deferred (explicit)

- Chat coach / program generation / model keys in app
- Photo cloud sync + public share of body photos
- Advanced pinch-zoom / editing for compare
- Native Google account sheet (#112)

## USP (product north star)

**Explainable progressive overload coach** — offline-first, cites your history, suggests next load with reasons.
