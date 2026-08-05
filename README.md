# Incline

A workout tracker built with React Native + Expo. Log sets with per-exercise rest timers, follow multi-week programs, and watch your volume and personal records grow.

> **Status:** pre-alpha. Local-first and single-device (SQLite); there is **no cloud sync yet** and accounts are required to use the app.

## Features

- **Accounts** — Email sign-up / sign-in via Clerk (mandatory)
- **Workout logging** — Live session screen with weight/reps per set, warm-up sets, previous-session carry-over, one-tap complete, undo, and an auto-advancing keyboard flow
- **Rest timer** — Per-exercise countdown with presets, ±15s, skip, and a completion sound + haptic
- **Templates** — Save reusable workouts and start one in a tap; Home suggests a routine
- **Programs** — Multi-week programs with a day-by-day grid (view-only today; builder planned — see ROADMAP)
- **Progress & insights** — Volume over time, streaks, estimated 1RM, personal records, muscle split, PR calls
- **Bodyweight tracking** — Trend chart with optional goal
- **Exercise library** — Large catalog with muscles, equipment, and instructions (Supabase-backed, with a bundled fallback catalog)
- **Home feed** — Recent workout history with stats and a "no workouts yet" first-run state
- **Tools** — Plate calculator (bar type + include-bar toggle), 1RM / bodyweight calculators, calendar
- **Preferences** — kg/lb unit toggle, dark/light/system theme, accent color (indigo default + alternatives), haptics, warm-up sets, auto-start rest, default rest duration
- **Offline-first** — Everything is stored locally in SQLite; works without internet

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 57, React Native 0.86 |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 (TailwindCSS) |
| Database | expo-sqlite (local) |
| Auth | Clerk (`@clerk/clerk-expo`) |
| Remote data | Supabase (exercise library) |
| State | Zustand (persisted) |
| Icons | Lucide React Native |
| Animations | React Native Reanimated |
| Charts | react-native-gifted-charts |
| Lists | FlashList |
| Fonts | Geist (`@expo-google-fonts/geist`) |

## Getting Started

Prerequisites: Node 20+, an Expo account for running on a device.

```bash
# Install dependencies
npm install

# Copy and fill in the environment variables
cp .env.example .env.local

# Start the dev server
npx expo start

# Run on Android / iOS
npx expo start --android
npx expo start --ios
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (auth is mandatory) |
| `EXPO_PUBLIC_SUPABASE_URL` | No | Supabase project URL for the exercise library |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key for the exercise library |
| `EXPO_PUBLIC_EXERCISEDB_API_KEY` / `_HOST` | No | Only needed for the one-time exercise import script |

If the Supabase variables are missing, the app falls back to the bundled local exercise catalog.

## Project Structure

```
src/
├── app/                    # Expo Router file-based routes
│   ├── (auth)/             # Sign-in / sign-up
│   ├── (onboarding)/       # First-run setup (name, bodyweight, goal, level)
│   ├── (app)/              # Authenticated area
│   │   ├── (tabs)/         # Home, Workouts, Progress, Profile
│   │   ├── settings/       # App settings
│   │   ├── program/[id]    # Program detail (view-only)
│   │   └── plate-calculator/, bodyweight/, calendar/, calculator/
│   ├── session/[id]        # Active workout session
│   ├── summary/[id]        # Post-workout summary
│   ├── workout/[id]        # Workout preview / template detail
│   ├── edit-workout/[id]   # Edit a logged workout
│   └── exercise/[id]       # Exercise detail
├── components/
│   ├── common/             # Shared components (Text, TabBar, Screen, states)
│   ├── ui/                 # Primitives (Button, Card, Dialog, Sheet, Input…)
│   ├── workout/            # Session-specific (SetRow, RestTimer, NumberStepper…)
│   ├── progress/           # Charts, PR cards, muscle donut
│   └── exercise/           # Exercise list items, create form
├── db/                     # SQLite schema, queries, types, helpers
├── hooks/                  # Custom hooks (rest timer, haptics, data fetching)
├── store/                  # Zustand stores (settings, active workout)
├── lib/                    # Utilities (cn, icon-color, plate-calculator, env)
└── auth/                   # Clerk token cache (secure store)
```

## Database

Local SQLite database (all user data lives on-device):

- `exercises`, `exercise_aliases`, `exercise_secondary_muscles`, `exercise_instructions`, `exercise_images`
- `workout_templates`, `template_exercises`
- `programs`, `program_workouts`
- `workout_logs`, `set_entries`
- `user_profile`, `bodyweight_entries`
- `kv` (persisted app settings), `schema_meta` (schema version + seed tracking)

## Scripts

```bash
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm test             # Unit tests (calc helpers, migrations, session SQL)
```

## License

Private — not for distribution.
