"use client";

import { useState, useEffect } from "react";

export interface AddressSuggestion {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode?: string;
  country: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
}

export function useAddressSearch(query: string, countryCode?: string, debounceMs = 350) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams({ q: query });
      if (countryCode) params.set("country", countryCode);

      fetch(`/api/address/search?${params.toString()}`)
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled && json.success) setSuggestions(json.data.suggestions);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, countryCode, debounceMs]);

  return { suggestions, isLoading };
}
