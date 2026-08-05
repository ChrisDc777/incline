/**
 * Shared screen spacing. Prefer these over ad-hoc padding so every screen
 * shares the same rhythm.
 */
export const SCREEN_PAD = 16;

export const SCREEN_CONTENT = {
  paddingHorizontal: SCREEN_PAD,
  paddingBottom: 32,
} as const;

export const SCREEN_CONTENT_CTA = {
  paddingHorizontal: SCREEN_PAD,
  paddingBottom: 160,
} as const;

/** Tailwind class for in-screen header chrome rows. */
export const SCREEN_HEADER = 'px-4 pt-4 pb-3';
