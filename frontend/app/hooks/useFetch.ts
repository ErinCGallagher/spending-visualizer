/**
 * Generic data-fetching hook with loading and error state.
 * Passing `null` as the url disables the fetch (useful for conditional fetching).
 */

"use client";

import { useEffect, useState } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export function useFetch<T>(
  url: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[]
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (url === null) return;

    setLoading(true);
    setError(false);

    fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json() as Promise<T>;
      })
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setLoading(false));
    // deps array is controlled by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
