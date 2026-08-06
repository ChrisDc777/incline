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
      .catch((err) => {
        console.error('[db] openDatabase failed', err);
        // Keep ready=false so the gate does not route into onboarding on a broken DB.
        // openDatabase clears its cache on failure so a remount can retry.
      });
    return () => {
      active = false;
    };
  }, []);
  return ready;
}
