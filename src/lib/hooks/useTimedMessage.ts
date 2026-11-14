"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Shows a message, then auto-clears it after `durationMs`. Replaces three
 * separate inline `useState` + `window.setTimeout` implementations that
 * had drifted to slightly different durations and none of which cleared
 * their timeout on unmount.
 */
export function useTimedMessage(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback(
    (text: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(text);
      timeoutRef.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [message, showMessage] as const;
}
