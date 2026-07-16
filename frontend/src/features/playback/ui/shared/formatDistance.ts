// Presentational distance formatter shared by the multi-vessel proximity overlays
// (VesselConnectionOverlay pairwise chip, VesselClusterOverlay hull-diameter chip).
// Kept in ui/ (not model/) because it produces display strings, not domain numbers.
export function formatDistance(meters: number): string {
  if (meters >= 10_000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters >= 1_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
