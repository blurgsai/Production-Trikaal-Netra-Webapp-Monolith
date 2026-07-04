export interface ChartDataFeatureApi {
  type: "Feature";
  id: string | number;
  properties: Record<string, unknown>;
}

export interface ChartDataResponseApi {
  type: "FeatureCollection";
  totalFeatures: number;
  numberMatched: number;
  numberReturned: number;
  features: ChartDataFeatureApi[];
}

export interface ChartDataQueryApi {
  propertyNames: string[];
  cqlFilter?: string;
  maxFeatures?: number;
}

const WFS_URL = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
  import.meta.env.VITE_GEOSERVER_WORKSPACE
}/ows`;

const LAYER_NAME = `${import.meta.env.VITE_GEOSERVER_WORKSPACE}:vessels`;

export async function fetchChartData(query: ChartDataQueryApi): Promise<ChartDataResponseApi> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    outputFormat: "application/json",
    propertyName: query.propertyNames.join(","),
    count: String(query.maxFeatures ?? 1000),
  });

  if (query.cqlFilter) {
    params.append("CQL_FILTER", query.cqlFilter);
  }

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`WFS chart data request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as ChartDataResponseApi;
}
