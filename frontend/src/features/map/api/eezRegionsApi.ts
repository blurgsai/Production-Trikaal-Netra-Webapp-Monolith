export interface EezRegionApi {
  id: string;
  name: string;
  bounds: [number, number, number, number];
}

export async function fetchEezRegions(): Promise<EezRegionApi[]> {
  const response = await fetch("/eez-regions.json");
  if (!response.ok) {
    throw new Error(`Failed to load EEZ regions: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
