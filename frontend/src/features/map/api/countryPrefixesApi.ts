import type { CountryPrefixResponseApi } from "./types";

export async function fetchCountryPrefixes(): Promise<CountryPrefixResponseApi> {
  // Prototype: read from public JSON file
  const response = await fetch("/country-prefixes.json");
  if (!response.ok) {
    throw new Error("Failed to load country prefixes");
  }
  return response.json();
}
