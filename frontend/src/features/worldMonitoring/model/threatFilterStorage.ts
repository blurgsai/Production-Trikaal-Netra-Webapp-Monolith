import type { SavedThreatFilterSet, ThreatProgressiveFilter } from "./types";

const STORAGE_KEY = "trikaal_saved_threat_filters";

export function loadSavedThreatFilters(): SavedThreatFilterSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedThreatFilterSet[]) : [];
  } catch {
    return [];
  }
}

export function saveThreatFilter(
  name: string,
  filters: ThreatProgressiveFilter[],
): SavedThreatFilterSet[] {
  const saved = loadSavedThreatFilters();
  const entry: SavedThreatFilterSet = {
    name,
    filters: filters.map((f) => ({ ...f })),
    createdAt: new Date().toISOString(),
  };
  const existingIndex = saved.findIndex((s) => s.name === name);
  if (existingIndex >= 0) {
    saved[existingIndex] = entry;
  } else {
    saved.push(entry);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // storage quota exceeded or private mode — silently fail
  }
  return saved;
}

export function deleteSavedThreatFilter(name: string): SavedThreatFilterSet[] {
  const saved = loadSavedThreatFilters().filter((s) => s.name !== name);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
  return saved;
}
