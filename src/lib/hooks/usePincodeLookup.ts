"use client";

import { useState, useEffect, useRef } from "react";

interface PincodeLookupCallback {
  (result: { city: string; state: string; country: string; countryCode?: string }): void;
}

export function usePincodeLookup(pincode: string, countryCode: string, onFound: PincodeLookupCallback) {
  const [isLoading, setIsLoading] = useState(false);
  const lastLookedUp = useRef<string | null>(null);
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  useEffect(() => {
    const key = `${countryCode}:${pincode}`;
    if (pincode.length < 4 || key === lastLookedUp.current) return;

    let cancelled = false;
    lastLookedUp.current = key;
    setIsLoading(true);

    fetch(`/api/address/pincode/${pincode}?country=${countryCode}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          onFoundRef.current({
            city: json.data.city,
            state: json.data.state,
            country: json.data.country,
            countryCode: json.data.countryCode,
          });
        }
      })
      .catch(() => {
        // Lookup failure just means no auto-fill — fields remain manually editable.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pincode, countryCode]);

  return { isLoading };
}
