# P1 Closeout and P2 Coaching

This document summarizes the P1 habit-loop closeout and P2 explainable coaching layer shipped in this release.

## P1 — Habit loops (closed)

| Feature | Implementation |
|---------|----------------|
| Dynamic Home context | [`src/lib/home-context.ts`](../src/lib/home-context.ts) ranks promo/context cards (max 2); [`src/components/home/home-context-card.tsx`](../src/components/home/home-context-card.tsx) |
| Weekly consistency goal | `weeklyWorkoutGoal` in settings; [`getWeeklyConsistency`](../src/db/queries/progress.ts); Calendar + Home stat row |
| Announcements v1 | Static pack in [`src/lib/announcements/`](../src/lib/announcements/); dismiss persisted locally |
| Credible suggestions | [`getSuggestedTemplate`](../src/db/queries/templates.ts) uses recent/frequent templates |
| Duration target | Editable `estimatedMinutes` on template editor |
| Measurement export | Dedicated [export screen](../src/app/(app)/export.tsx): pick workouts / custom exercises / bodyweight / circumference + CSV or JSON |
| Motion | Subtle `FadeInDown` on Home context cards |

**Deferred (backlog issues):** week-vs-week photo comparison, measurement goals, full motion system.

## P2 — Explainable progressive overload (Stage A)

| Layer | Path |
|-------|------|
| Contracts | [`src/coaching/types.ts`](../src/coaching/types.ts) |
| Plate math | [`src/coaching/plates.ts`](../src/coaching/plates.ts) |
| Double progression | [`src/coaching/overload.ts`](../src/coaching/overload.ts) |
| Home insights | [`src/coaching/insights.ts`](../src/coaching/insights.ts) |
| DB read models | [`src/db/queries/coaching/suggestions.ts`](../src/db/queries/coaching/suggestions.ts) |

**Surfaces:** workout preview, active session assist, post-workout summary “Next time”, Home coaching card.

**Schema:** migration `011_set_type` — warm-up vs working; `012_warmup_backfill` tags legacy light prefixes.

## P2 — Guardrails (Stage B)

| Layer | Path |
|-------|------|
| Fatigue | [`src/coaching/fatigue.ts`](../src/coaching/fatigue.ts) — in-session reps/load drop cues |
| Deload | [`src/coaching/deload.ts`](../src/coaching/deload.ts) — 4-week streak → confirm copy at ~60% sets |
| Substitution | [`src/coaching/substitution.ts`](../src/coaching/substitution.ts) — muscle + pattern + equipment rank |
| Insights | [`src/coaching/insights.ts`](../src/coaching/insights.ts) — ranked list; Home still shows one card |

**Surfaces:** session banner + swap, Home deload card → `/(app)/deload`, muscle distribution coaching + least-trained, summary fatigue line.

**Constraint:** suggestions only. `createDeloadTemplate` copies; it never mutates the source routine or program.

## P2 — Hygiene (PR semantics + warm-up backfill)

| Layer | Path |
|-------|------|
| PR rules | [`src/coaching/pr.ts`](../src/coaching/pr.ts) — `heaviest_weight`, `estimated_1rm`, `rep_record`, `volume_record` |
| PR reads | [`src/db/queries/coaching/prs.ts`](../src/db/queries/coaching/prs.ts) |
| Warm-up heuristic | [`src/coaching/warmup-backfill.ts`](../src/coaching/warmup-backfill.ts) + migration `012` |

Celebration surfaces (toast, summary, recap, feed badge, achievements) use heaviest or e1RM and require a strict beat. Progress leaderboard still shows all-time bests per exercise.

## Architecture decisions

### Chosen: ranked Home context slot (not a feed)
- **Why:** Avoids card pile-up; reuses week/month promo patterns; announcements slot in cleanly.
- **Alternative rejected:** Separate “inbox” tab — too much navigation for pre-alpha.

### Chosen: weekly streak + weekly goal (not day streak)
- **Why:** Matches existing `getStreak()` semantics (`Nw` badges); goals align with program thinking.
- **Caveat:** Issue copy mentioning “day streak” was misleading; UI now says `w streak` explicitly.

### Chosen: offline rule engine first, AI later
- **Why:** USP is trustworthy load suggestions without network; rules own numbers.
- **Stack when ready:** Clerk JWT → Supabase Edge Function → structured JSON narrations over `FeaturePackV1` (no model keys in app).

### Chosen: `set_type` column vs heuristic warm-up detection
- **Why:** Explicit tagging is reliable; warm-up button already exists.
- **Follow-up:** Migration `012` applies a conservative prefix heuristic for pre-`set_type` logs (light/incomplete sets before near-peak work). Close ramps and back-off sets stay working.

## P2 deferred (backlog)

- Body-measure ↔ training observational stories (sparse data; from #98)
- AI-1: Edge Function narration ([#99](https://github.com/ChrisDc777/incline/issues/99))
- Program + settings sync extension (milestone follow-up on #57)
- Measurement goals ([#94](https://github.com/ChrisDc777/incline/issues/94)) — keep open; do not build until Measures has regular use
- Photo comparison gallery ([#23](https://github.com/ChrisDc777/incline/issues/23)); photo cloud sync ([#109](https://github.com/ChrisDc777/incline/issues/109))
- Native Google account picker ([#112](https://github.com/ChrisDc777/incline/issues/112)) — much later

## P2 — Stage C (complete)

| Layer | Path |
|-------|------|
| Schema | migration `014_set_rpe` — nullable integer on `set_entries` |
| RPE | [`src/coaching/rpe.ts`](../src/coaching/rpe.ts); last-set ≥ 9 holds load |
| Readiness | [`src/coaching/readiness.ts`](../src/coaching/readiness.ts) + kv store; Home check-in; `tired` softens suggestions |
| Program diffs | [`src/coaching/program-plan.ts`](../src/coaching/program-plan.ts); confirm UI [`program-adjust`](../src/app/(app)/program-adjust.tsx) |
| Session UI | RPE chips under completed working sets |
| Settings | `showRpe` (default on; never required) |

**Constraint:** completing a set never waits on RPE/readiness. Intensity uses last-set RPE; tired check-in only softens. Program changes never write until Confirm.

## Verification

```bash
npm run typecheck
npm run test
```

Key tests: [`src/lib/__tests__/home-context.test.ts`](../src/lib/__tests__/home-context.test.ts), [`src/coaching/__tests__/pr.test.ts`](../src/coaching/__tests__/pr.test.ts), [`src/coaching/__tests__/warmup-backfill.test.ts`](../src/coaching/__tests__/warmup-backfill.test.ts)
