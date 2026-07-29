# Incline

A minimal workout tracker built with React Native and Expo. Log sets, track progress, and build consistency — no account required.

## Features

- **Workout logging** — Pick exercises, log weight/reps per set, complete sets with a tap
- **Rest timer** — Countdown timer with preset durations and manual +/- controls
- **Workout templates** — Save and reuse workout structures (exercises, sets, reps, rest)
- **Programs** — Multi-week training programs with day-by-day scheduling
- **Progress tracking** — Volume over time, streaks, personal bests, exercise history
- **Exercise catalog** — 100+ exercises with muscle groups, equipment, and step-by-step instructions
- **Offline-first** — Everything stored locally in SQLite, works without internet
- **Dark mode** — System-aware light/dark theme with green accent
- **Haptic feedback** — Tactile responses on set completion and key actions

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 57, React Native 0.86 |
| Navigation | Expo Router v57 (file-based) |
| Styling | NativeWind v4 (TailwindCSS) |
| Database | expo-sqlite (SQLite) |
| State | Zustand |
| Icons | Lucide React Native |
| Animations | React Native Reanimated |
| Fonts | Inter (via @expo-google-fonts) |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

## Project Structure

```
src/
├── app/                    # Expo Router file-based routes
│   ├── (app)/              # Main tabbed layout
│   │   ├── (tabs)/         # Home, Workouts, Progress, Profile
│   │   ├── template/[id]   # Template editor
│   │   └── program/[id]    # Program detail
│   ├── (onboarding)/       # First-run setup
│   ├── session/[id]        # Active workout session
│   ├── summary/[id]        # Post-workout summary
│   ├── workout/[id]        # Workout preview
│   └── exercise/           # Exercise browser
├── components/
│   ├── common/             # Shared components (Avatar, Text, TabBar)
│   ├── ui/                 # Primitives (Button, Card, Dialog, Input)
│   ├── workout/            # Session-specific (SetRow, RestTimer, NumberStepper)
│   ├── progress/           # Charts and progress rings
│   └── exercise/           # Exercise detail cards
├── db/                     # SQLite schema, queries, types, helpers
├── hooks/                  # Custom hooks (rest timer, haptics, data fetching)
├── store/                  # Zustand stores (settings, active workout)
├── constants/              # Rest presets, exercise seed data
└── lib/                    # Utilities (cn, icon-color resolver)
```

## Database

Local SQLite database with the following tables:

- **exercises** — Exercise catalog with muscles, equipment, instructions
- **workout_templates** — User-created workout templates
- **template_exercises** — Exercises within a template (sets, reps, rest)
- **programs** — Multi-week training programs
- **workout_logs** — Completed workout sessions
- **set_entries** — Individual sets (weight, reps, completed)
- **user_profile** — Name, goal, bodyweight, unit preference

## Scripts

```bash
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
```

## License

Private — not for distribution.
