import type { SavedArticleFilterSet } from "./types";

const STORAGE_KEY = "trikaal_saved_article_filters";

export function loadSavedArticleFilters(): SavedArticleFilterSet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load saved article filters:", error);
    return [];
  }
}

export function saveArticleFilter(
  name: string,
  filters: SavedArticleFilterSet["filters"],
): SavedArticleFilterSet[] {
  const existing = loadSavedArticleFilters();
  const newSet: SavedArticleFilterSet = {
    name,
    filters: filters.map((f) => ({ ...f })),
    createdAt: new Date().toISOString(),
  };
  
  // Remove existing with same name
  const filtered = existing.filter((s) => s.name !== name);
  const updated = [...filtered, newSet];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save article filter:", error);
  }
  
  return updated;
}

export function deleteSavedArticleFilter(name: string): SavedArticleFilterSet[] {
  const existing = loadSavedArticleFilters();
  const updated = existing.filter((s) => s.name !== name);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete article filter:", error);
  }
  
  return updated;
}
