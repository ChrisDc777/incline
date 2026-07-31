import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic async data hook with loading/error/refetch. The backbone of every
 * data-bound screen so loading/empty/error states stay consistent.
 *
 * Key behavior: during refetches, the previous `data` is preserved (not reset
 * to null) so UI components stay visible and don't flicker/unmount.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  const [nonce, setNonce] = useState(0);

  // Keep the latest fn in a ref without writing it during render (react-hooks/refs).
  // Declared before the fetch effect so the ref is fresh when that effect runs.
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let active = true;
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      // Preserve previous data during refetches so UI doesn't flash empty
      ...(s.data !== null ? {} : { data: null }),
    }));
    fnRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}
