import { useState, useEffect, useCallback } from "react";
import { fetchCountryPrefixes } from "../api";
import { mapCountryPrefixesFromApi } from "../model/mappers";
import type { CountryPrefix } from "../model/types";

export function useCountryPrefixes() {
  const [countries, setCountries] = useState<CountryPrefix[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCountryPrefixes();
      setCountries(mapCountryPrefixesFromApi(data));
    } catch {
      setError("Failed to load country prefixes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { countries, loading, error, refresh: load };
}
