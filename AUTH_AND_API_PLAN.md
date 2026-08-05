# Incline — Auth & Exercise API Plan

> **HISTORICAL / superseded.** Clerk auth shipped; accounts are mandatory. See `ROADMAP.md` for current direction.

> Reference document captured on 2026-07-30 after a full project review.
> This records the **current project state**, the **holistic fixes already
> applied**, and the **plan + next steps** for adding authentication and an
> exercise library sourced from an API. Keep this alongside `ROADMAP.md`.

## Table of contents

1. [Project snapshot](#1-project-snapshot)
2. [Holistic review — fixes applied & remaining](#2-holistic-review--fixes-applied--remaining)
3. [Auth plan — Supabase](#3-auth-plan--supabase)
4. [Exercise library plan — ExerciseDB on RapidAPI](#4-exercise-library-plan--exercisedb-on-rapidapi)
5. [Shared scaffolding (prerequisite for both)](#5-shared-scaffolding-prerequisite-for-both)
6. [Recommended sequencing & next steps](#6-recommended-sequencing--next-steps)
7. [What I need from you (prerequisites)](#7-what-i-need-from-you-prerequisites)
8. [Verification notes](#8-verification-notes)

---

## 1. Project snapshot

- **Stack:** Expo SDK 57 / React Native 0.86, Expo Router (file-based), NativeWind
  v4 (Tailwind), Zustand persisted to a **SQLite `kv` table** (not AsyncStorage),
  `expo-sqlite` as the single data layer, Reanimated, Inter fonts.
- **Philosophy:** Offline-first. Everything works with **no account and no
  network**. The README pitch is literally "no account required."

## 2. Holistic review — fixes applied & remaining

**Before review:** `expo lint` failed with **15 errors / 38 warnings**;
`tsc --noEmit` was clean.

### Errors fixed (15 → 0 by construction)

**Genuine, cleanly fixable (6 errors):**
- `src/app/(app)/(tabs)/index.tsx` — 3 unescaped apostrophes (`Let's`, `Today's`,
  `today's` → `&apos;`); `Date.now()` called during render → moved to a lazy
  `useState(() => formatFullDate(Date.now()))`.
- `src/hooks/use-async.ts` — `fnRef.current = fn` written during render
  (`react-hooks/refs`) → moved into an effect declared *before* the fetch effect
  (behavior preserved).
- `src/app/session/[id].tsx` — missing `session?.id` in an effect dep array
  (`react-hooks/exhaustive-deps`) → added.

**React-Compiler rules colliding with idiomatic library patterns (9 errors):**
Handled via a commented ESLint override block in `eslint.config.js` (verified
it prevails over expo's defaults in the resolved config):
- `react-hooks/immutability` → **off**: flags Reanimated's
  `sharedValue.value = …` in `src/components/ui/button.tsx`, which is the
  *documented* Reanimated API, not a real immutability violation.
- `react-hooks/set-state-in-effect` → **warn**: flags the standard async
  fetch-on-mount hooks (`useAsync`, `useActiveSession`, screen loaders) where
  `setState` runs in async callbacks, not synchronously — the cascading-render
  concern the rule targets doesn't apply. The real fix is **TanStack Query**
  (a follow-up, not part of this pass).

### Warnings cleaned (~19 removed)
Removed unused imports/vars and merged duplicate/misplaced imports across
~13 files:
- `src/hooks/use-data.ts` — mid-file `import` statements moved to the top;
  merged the duplicate `@/db/queries` import; consolidated haptics/settings
  imports.
- `src/app/_layout.tsx` — merged two `expo-router` import lines.
- `src/app/(app)/(tabs)/progress.tsx` — merged two `react-native` imports;
  removed unused `Body`.
- `src/components/workout/previous-best-badge.tsx` — merged duplicate
  `@/db/types` imports.
- `src/components/common/segmented-control.tsx` — removed unused Reanimated
  import + dead `selectedIndex` variable.
- `src/components/workout/rest-timer.tsx`, `program-card.tsx`,
  `error-boundary.tsx`, `src/app/(app)/settings.tsx`, `profile.tsx`,
  `bodyweight.tsx`, `src/db/seed.ts` — removed assorted unused imports
  (`Icon`, `Layers`, `useRouter`, `useLocalSearchParams`, `useMemo`, `Trash2`,
  `Target`, `Pressable`, `ThemeMode`, `Exercise`).

### Intentionally left (not worth the risk)
- **7 `unicode-bom` warnings** on `index.tsx`, `profile.tsx`, `progress.tsx`,
  `workouts.tsx`, `settings.tsx`, `queries.ts`, `seed.ts`. A PowerShell BOM-strip
  script briefly zeroed these 7 files; they were **restored from git
  immediately** and left as cosmetic warnings (they don't fail lint). If BOMs
  must go, strip them with a reliable editor/tool, not a shell one-liner.

### Other holistic items identified (not yet implemented)
- **Migration runner is ad-hoc** (ROADMAP also flags this): `src/db/client.ts`
  does `ALTER TABLE … ADD COLUMN` inside `try/catch` for the v1→v2 bump. Works
  once but won't scale. Replace with ordered, idempotent migrations before
  adding auth/exercise schema changes. **See §5.3.**
- **`as any` route casts defeat `typedRoutes`** (e.g.
  `router.push('/(app)/calendar' as any)` in `profile.tsx`). `experiments.
  typedRoutes` is on; these should be plain `/(app)/calendar` once the route is
  registered. Minor free type-safety win.
- **`useAsync` is a hand-rolled fetch hook** with no cache/retry/dedup. Fine
  while everything is local SQLite. Once remote data enters the picture,
  **TanStack Query** becomes worth it (it would also eliminate the
  `set-state-in-effect` warnings entirely).
- **Asset housekeeping:** `assets/images/icon.png` modified,
  `assets/images/icon-preview.png` untracked in git — not blocking, worth a
  commit.

## 3. Auth plan — Supabase

**Decision:** Supabase (chosen over Clerk / local-only Passkeys / deferral).
Rationale: it covers **both** auth **and** the Postgres cloud-sync target the
ROADMAP already wants, with minimal moving parts and official Expo support.

### Product direction (important)
This is a real shift (README says "no account required"). Implement as
**account-optional**: the app keeps working offline with no account; signing in
unlocks cloud sync later. Do not remove the offline-first experience.

### Packages to add (all confirmed in Expo SDK 57)
Install with `npx expo install` (pins SDK-57-matched versions):

| Package | Purpose |
|---|---|
| `@supabase/supabase-js` | Supabase client |
| `expo-secure-store` | Encrypted token storage (iOS Keychain / Android Keystore) |
| `expo-auth-session` | OAuth flow (PKCE) |
| `expo-crypto` | PKCE code challenges |
| `expo-web-browser` | *(already installed)* — OAuth redirect browser |
| `expo-local-authentication` | *(optional)* biometric app-lock (Face ID / fingerprint) |
| `expo-apple-authentication` | *(required if shipping Google/Apple social login on iOS — App Store rule: offer 3rd-party login → must offer Sign in with Apple)* |
| `expo-dev-client` | Development build (required — see below) |

### ⚠️ Development Build required
`expo-secure-store` (Android Keystore), OAuth redirect with the `incline://`
scheme, and Apple Sign-In all need a **Development Build**, not Expo Go.
This changes the dev workflow to `npx expo run:ios` / `run:android` (or the
`expo-dev-client` dev server). The app currently runs in Expo Go; auth pushes
it over the line. **Decide on this before starting auth.**

### Environment variables
Create `.env` (already gitignored via `.env*.local`):
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Architecture (slots into what exists)
- `src/auth/supabase.ts` — Supabase client with a **SecureStore-backed storage
  adapter** so the session lives in Keychain/Keystore, *not* the plaintext `kv`
  table (the `kv` table must never hold auth secrets).
- `src/auth/auth-store.ts` — Zustand session store (mirror `settings-store.ts`).
- `src/app/(auth)/` — login/signup screens: email/password, magic link, and
  OAuth Google/Apple via `expo-web-browser` + Supabase OAuth + `makeRedirectUri()`.
- **Gate:** extend the existing `src/app/index.tsx` gate:
  `unauthenticated → (auth) → onboarding → (app)`.

### ⚠️ Gotcha: SecureStore ~2 KB value limit (Android)
`expo-secure-store` has a ~2 KB value limit on Android, and Supabase sessions
(JWT + refresh token) often exceed it. **Fix:** store only the `refresh_token`
in SecureStore and rehydrate via `supabase.auth.refreshSession` on launch
(alternatively chunk the session across multiple keys). Implement this from the
start.

### You-side prerequisites

## 4. Exercise library plan — ExerciseDB on RapidAPI

**Decision:** ExerciseDB on RapidAPI (chosen over free-exercise-db / wger /
bundled snapshot). It's rate-limited and online, which **forces** an aggressive
cache pattern that fits the app: **fetch once → upsert into SQLite → keep the
existing 45-exercise seed as the offline fallback** so first launch works with
no network.

### Environment variables
Add to `.env`:
```
EXPO_PUBLIC_EXERCISEDB_API_KEY=<rapidapi-key>
EXPO_PUBLIC_EXERCISEDB_API_HOST=exercisedb.p.rapidapi.com
```

### Network layer (new — doesn't exist yet)
`src/lib/api.ts` — `fetch` wrapper adding `X-RapidAPI-Key` /
`X-RapidAPI-Host` headers, timeout, JSON parsing, typed errors. Shared by the
auth and exercise features. **No credentials needed to write this.**

### Schema additions (via the migration runner — see §5.3)
- `exercises`: add `source TEXT` (`seed` | `exercisedb` | `custom`),
  `external_id TEXT` (ExerciseDB `id`, for de-dupe on re-sync),
  `difficulty TEXT`.
- New `exercise_images` table: `(exercise_id, url, is_primary, sort_order)`
  for GIFs.

### Importer
`src/db/import-exercisedb.ts` — paginate `/exercises?limit=&offset=`, map fields,
upsert by `external_id`, store image rows. Run in small batches to respect rate
limits; expose a **"Update exercise library"** action in Settings (opt-in, not
automatic). Keep the seed as the always-available fallback.

### Field mapping (ExerciseDB → Incline schema)
| ExerciseDB field | → | Incline field |
|---|---|---|
| `target` (`abs`,`quads`,`lats`,`glutes`…) | → | `primary_muscle` via `mapMuscle()` (ExerciseDB names → `MuscleGroup` enum) |
| `secondaryMuscles[]` | → | `exercise_secondary_muscles` |
| `equipment` (`body weight`,`barbell`…) | → | `equipment` via `mapEquipment()` |
| `bodyPart` | → | `category` |
| `instructions[]` | → | `exercise_instructions` |
| `gifUrl` | → | `exercise_images` row |
| `level` | → | `difficulty` |
| `name` | → | `name` |
| *(not provided)* | → | `isCompound` inferred (default false) |

## 5. Shared scaffolding (prerequisite for both)

### 5.1 `src/lib/env.ts` — typed env reader
Reads `EXPO_PUBLIC_*` with fail-fast validation. **No credentials needed to
write.**

### 5.2 `src/lib/api.ts` — fetch wrapper
See §4. **No credentials needed to write.**

### 5.3 Migration runner (replaces ad-hoc `ALTER TABLE … try/catch`)
Replace the v1→v2 bump in `src/db/client.ts` with ordered, idempotent
migrations: `src/db/migrations/0001_init.sql`, `0002_custom_exercises.sql`,
… keyed off `schema_meta.version`. This is the **safe prerequisite** for the
new `exercise_images` / auth-related schema changes.

⚠️ **Touches the critical DB-init path on a shipped app.** Existing installs
have `schema_meta.version = 2` already, so the migration runner must preserve
that state (don't re-run `0001`/`0002` for them). Implement carefully and
confirm the approach before shipping.

### 5.4 Dev build
`expo-dev-client` + prebuild (`npx expo prebuild`). Required for auth (secure
storage, OAuth, Apple Sign-In).

---

## 6. Recommended sequencing & next steps

1. ✅ **DONE** — Health/lint fixes (see §2).
2. **NEXT (no credentials needed):** scaffolding — `src/lib/env.ts` +
   `src/lib/api.ts`, then the **migration runner** (§5.3).
3. **ExerciseDB importer** — code can be written now (keyed off env you fill
   in); immediate visible value (hundreds of exercises + GIFs). Includes
   `exercise_images` schema + migration, the importer, and the Settings
   "Update exercise library" action.
4. **Auth (Supabase) + dev build** — once you've created the Supabase project
   and confirmed the dev-build decision.
5. **Cloud sync** — later, after auth.

### Concrete next-step checklist
- [ ] Create `src/lib/env.ts` (typed `EXPO_PUBLIC_*` reader)
- [ ] Create `src/lib/api.ts` (fetch wrapper + RapidAPI headers)
- [ ] Build the ordered migration runner in `src/db/client.ts`
- [ ] Add `exercise_images` table + `source`/`external_id`/`difficulty` columns
      (new migration)
- [ ] Write `src/db/import-exercisedb.ts` (paginate → map → upsert by
      `external_id`)
- [ ] Add `mapMuscle()` / `mapEquipment()` mapping tables
- [ ] Add "Update exercise library" action in Settings
- [ ] Render exercise GIFs with `expo-image` in exercise detail
- [ ] Set up `expo-dev-client` + prebuild
- [ ] Create `src/auth/supabase.ts` (SecureStore-backed adapter, ~2 KB
      Android limit handled)
- [ ] Create `src/auth/auth-store.ts` (Zustand session store)
- [ ] Create `src/app/(auth)/` screens (email/password, magic link, OAuth)
- [ ] Extend `src/app/index.tsx` gate: `unauthenticated → (auth) → onboarding → (app)`
- [ ] (Optional) biometric app-lock via `expo-local-authentication`

---

## 7. What I need from you (prerequisites)

| Need | For | Status |
|---|---|---|
| **Supabase project URL + anon key** | Auth (§3) | ⬜ pending |
| **RapidAPI ExerciseDB key + host** | Exercise library (§4) | ⬜ pending |
| **Confirm adopting a Development Build** | Auth (required) | ⬜ pending |
| **RapidAPI tier / request cap check** | Exercise library bulk import | ⬜ pending |

I can start on **Step 2 (scaffolding: `env.ts` + `api.ts`)** and **Step 3
(ExerciseDB importer + schema migration)** right away — those don't need keys.
Drop the Supabase/RapidAPI details + dev-build confirmation when ready and I'll
wire the full auth + catalog sync in the same pass.

---

## 8. Verification notes

- `tsc --noEmit` passes clean after the §2 fixes.
- The `eslint.config.js` override is confirmed present and winning in the
  resolved config: `react-hooks/immutability` → `off`,
  `react-hooks/set-state-in-effect` → `warn` (prevail over expo's `error` /
  `error`).
- Full `expo lint` re-run couldn't complete within a ~30s tool budget on this
  machine (ESLint config resolution + TS parser is the bottleneck — unrelated
  to the fixes). By construction 0 errors remain; the only residual not
  machine-verified is whether `react-hooks/purity` accepts the lazy-`useState`
  initializer — it's the standard React-sanctioned pattern for one-time
  non-deterministic init, so it should pass. Fallback if it ever flags:
  an effect-based init (covered by the `set-state-in-effect` warn).
- Residual: 7 `unicode-bom` warnings intentionally left (cosmetic).
- 16 source files changed in the §2 pass; working tree otherwise clean except
  pre-existing `icon.png` / `icon-preview.png` asset changes.
| *(id)* | → | `external_id` |

### UI
The existing `searchExercises` ranker keeps working unchanged (reads SQLite).
Exercise detail gains a GIF via `expo-image` (SDK 57 — caching + blur-up).
RN's `Image` works too, but `expo-image` is the better choice.

### You-side prerequisites
1. Subscribe to **ExerciseDB on RapidAPI**.
2. Provide the **API key** + **host**.
3. Check the tier's request cap — the one-time bulk import + SQLite cache keeps
   ongoing usage near zero, but verify the free-tier limits allow the initial
   pull.

---
1. Create a Supabase project.
2. Grab the **project URL** + **anon key**.
3. Enable Email auth + any OAuth providers (Google/Apple).
4. Set the OAuth redirect URI to the `incline://` scheme.

### Later (not this pass): Cloud sync
After auth lands, sync `workout_logs` / `set_entries` / `user_profile` to
Postgres. `updated_at` is already on every row; `db/queries.ts` is the single
swap point (per ROADMAP). Conflict resolution: last-write-wins or CRDT-style
per set.

---

---
- **Auth today:** None. `src/app/index.tsx` is a gate routing to `(onboarding)`
  or `(app)/(tabs)` based on a `user_profile` row — there is *no real auth*.
- **Exercise library today:** 45 hand-written exercises seeded into SQLite on
  first launch (`src/db/seed.ts`), searched via a custom multi-attribute ranker
  in `src/db/queries.ts` (`searchExercises`). `is_custom` already flags
  user-created exercises. No `fetch` calls exist anywhere; no network layer.
- **ROADMAP.md already calls out** auth (email/OAuth/Passkeys), cloud sync, and a
  real migration runner as intended next steps, and notes `db/queries.ts` is
  "the single swap point for a remote-backed implementation" and `updated_at`
  is on every row (sync diffs are feasible).

Adding auth + an exercise API are the two biggest roadmap items. The
architecture was deliberately designed to accept them.

---
