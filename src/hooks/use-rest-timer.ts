import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Local rest-timer countdown. Kept local to the session screen (no global
 * ticking) so the rest of the app doesn't re-render every second.
 *
 * Handles backgrounding: when the app returns to foreground, the timer
 * calculates elapsed time from wall-clock timestamps so it stays accurate
 * even if the JS interval was suspended by the OS.
 */
export function useRestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(0); // timestamp when timer should hit 0

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
    deadlineRef.current = Date.now() + seconds * 1000;
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setRemaining(0);
    setTotal(0);
    deadlineRef.current = 0;
  }, []);

  const add = useCallback((delta: number) => {
    setRemaining((r) => {
      const next = Math.max(0, r + delta);
      deadlineRef.current = Date.now() + next * 1000;
      return next;
    });
    setRunning(true);
  }, []);

  // Handle app backgrounding — recalculate remaining from deadline on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && running && deadlineRef.current > 0) {
        const now = Date.now();
        const diff = deadlineRef.current - now;
        if (diff <= 0) {
          setRemaining(0);
          setRunning(false);
          deadlineRef.current = 0;
        } else {
          setRemaining(Math.ceil(diff / 1000));
        }
      }
    });
    return () => sub.remove();
  }, [running]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = deadlineRef.current - now;
      if (diff <= 0) {
        setRemaining(0);
        setRunning(false);
        deadlineRef.current = 0;
      } else {
        setRemaining(Math.ceil(diff / 1000));
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const justFinished = total > 0 && remaining === 0 && !running;

  // Keep "Done" visible briefly so completion isn't a silent disappear.
  useEffect(() => {
    if (!justFinished) return;
    const t = setTimeout(() => {
      setTotal(0);
      deadlineRef.current = 0;
    }, 1400);
    return () => clearTimeout(t);
  }, [justFinished]);

  return { remaining, total, running, justFinished, start, stop, add };
}
