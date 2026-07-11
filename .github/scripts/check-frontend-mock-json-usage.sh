#!/usr/bin/env bash
#
# Warns when frontend source files fetch static JSON from the Vite public/
# directory instead of calling a real backend API.
#
# This is a WARNING-only check — it always exits 0 so CI never fails.
# The warnings are printed to make developers aware of prototype code
# that should eventually be replaced with real API calls.
#
# Detection logic:
#   Scans .ts/.tsx files (excluding tests) for fetch() calls whose URL:
#     - Starts with '/' (Vite public-dir absolute path)
#     - Contains '.json'
#   Excludes URLs that start with a template expression like ${...}
#   (those reference a real API base URL, not a static public file).
#
# Usage: ./check-frontend-mock-json-usage.sh <src_dir>
#
set -euo pipefail

SRC_DIR="${1:-src}"

if [ ! -d "$SRC_DIR" ]; then
  echo "INFO: Source directory '$SRC_DIR' does not exist."
  exit 0
fi

WARNINGS=0

echo "=========================================="
echo "  Frontend Mock JSON Usage Check (WARNING)"
echo "  Directory: $SRC_DIR"
echo "=========================================="

# Scan all .ts/.tsx files, excluding test files and __tests__ directories
while IFS= read -r filepath; do
  [ -f "$filepath" ] || continue

  filename=$(basename "$filepath")

  # Skip test files
  [[ "$filename" == *.test.* ]] || [[ "$filename" == *.spec.* ]] && continue

  # Skip files inside __tests__ directories
  [[ "$filepath" == */__tests__/* ]] && continue

  # Look for fetch() calls with URLs that:
  #   - Start with a quote or backtick followed by '/' (static public path)
  #   - Contain '.json' somewhere in the URL
  # Patterns matched:
  #   fetch('/foo.json')          fetch("/foo.json")
  #   fetch(`/mock/foo/bar.json`)  fetch(`/mock/${var}.json`)
  # Excluded:
  #   fetch(`${API_BASE}/foo.json`)  — starts with ${, not /
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    echo "  ⚠️  WARNING: '$filepath' fetches static JSON from public/ instead of calling a backend API"
    echo "      $line"
    echo "      Consider replacing with a real API endpoint via axiosInstance."
    echo ""
    WARNINGS=$((WARNINGS + 1))
  done < <(grep -nE "fetch\(\s*['\"\`]/[^'\"]*\.json" "$filepath" 2>/dev/null || true)

done < <(find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null || true)

# ── Summary ──────────────────────────────────────────────────────────────
echo "=========================================="
if [ "$WARNINGS" -gt 0 ]; then
  echo "⚠️  $WARNINGS warning(s): static public JSON fetch(es) detected."
  echo ""
  echo "These are WARNINGS only — CI will not fail."
  echo "Replace public JSON fetches with real backend API calls before production."
  echo ""
  echo "Common patterns to look for:"
  echo "  fetch('/country-prefixes.json')     →  axiosInstance.get('/country-prefixes')"
  echo "  fetch('/eez-regions.json')          →  axiosInstance.get('/eez-regions')"
  echo "  fetch('/mock/playback/foo.json')    →  axiosInstance.get('/playback/foo')"
else
  echo "✅ No static public JSON fetches found."
fi
echo "=========================================="

# Always exit 0 — this is a warning, not an error
exit 0
