/** Rest timer presets shown in the configurable picker. */
export const REST_PRESETS = [
  { label: 'Off', seconds: 0 },
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
] as const;

export const DEFAULT_REST_SECONDS = 90;
