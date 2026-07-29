import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Local rest-timer countdown. Kept local to the session screen (no global
 * ticking) so the rest of the app doesn't re-render every second.
 */
export function useRestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setRemaining(0);
    setTotal(0);
  }, []);

  const add = useCallback((delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const justFinished = total > 0 && remaining === 0 && !running;

  return { remaining, total, running, justFinished, start, stop, add };
}
