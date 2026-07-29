/** Rest timer presets shown as quick-pick chips after completing a set. */
export const REST_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
] as const;

export const DEFAULT_REST_SECONDS = 90;
