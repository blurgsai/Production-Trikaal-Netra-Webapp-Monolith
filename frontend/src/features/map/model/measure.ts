import L from "leaflet";

export function distanceToNm(coords: L.LatLng[], map: L.Map): number {
  const distanceMeters = coords.reduce((sum, latlng, idx, arr) => {
    if (idx === 0) return 0;
    const prev = arr[idx - 1];
    return sum + map.distance(prev, latlng);
  }, 0);
  return distanceMeters / 1852;
}

export function formatNmLabel(distanceNM: number): string {
  return `<span style="background:#035b50; padding:3px 8px; border-radius:6px; font-size:11px; color:#fff; font-weight:600;">${distanceNM.toFixed(
    2,
  )} nm</span>`;
}
