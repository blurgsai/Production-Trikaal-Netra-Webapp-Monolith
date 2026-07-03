import type { VesselTableFilter, SavedFilterSet, Polygon } from "../model/types";

const STORAGE_KEY = "trikaal_saved_vessel_filters";

export function loadSavedFilters(): SavedFilterSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFilterSet[]) : [];
  } catch {
    return [];
  }
}

export function saveFilter(name: string, filters: VesselTableFilter[], polygonFilters?: Polygon[]): SavedFilterSet[] {
  const saved = loadSavedFilters();
  const entry: SavedFilterSet = {
    name,
    filters: filters.map((f) => ({ ...f })),
    polygonFilters: polygonFilters?.map((p) => ({ ...p })),
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

export function deleteSavedFilter(name: string): SavedFilterSet[] {
  const saved = loadSavedFilters().filter((s) => s.name !== name);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
  return saved;
}
