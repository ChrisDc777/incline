import { useEffect, useState } from 'react';

import { openDatabase } from '@/db/client';

/**
 * Triggers database open + seed on mount and reports readiness. The root layout
 * gates the splash screen on this so the first render already has data access.
 */
export function useDatabaseReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    openDatabase()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        // Don't block the UI on a db error; data hooks will surface error states.
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return ready;
}
