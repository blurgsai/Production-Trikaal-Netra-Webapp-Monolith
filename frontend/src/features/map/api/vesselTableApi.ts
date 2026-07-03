export interface VesselTableQueryApi {
  cqlFilter?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface VesselTableFeatureApi {
  type: "Feature";
  id: string | number;
  properties: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: number[];
  };
}

export interface VesselTableResponseApi {
  type: "FeatureCollection";
  totalFeatures: number;
  numberMatched: number;
  numberReturned: number;
  features: VesselTableFeatureApi[];
}

const WFS_URL = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
  import.meta.env.VITE_GEOSERVER_WORKSPACE
}/ows`;

const LAYER_NAME = `${import.meta.env.VITE_GEOSERVER_WORKSPACE}:vessels`;

export async function fetchVesselCount(cqlFilter?: string): Promise<number> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    resultType: "hits",
  });

  if (cqlFilter) {
    params.append("CQL_FILTER", cqlFilter);
  }

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`WFS count request failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const match = text.match(/numberMatched="(\d+)"/);
  const count = match ? parseInt(match[1], 10) : NaN;
  if (Number.isNaN(count)) {
    throw new Error("Failed to parse WFS count response");
  }
  return count;
}

export async function fetchVesselCategoryCounts(cqlFilter?: string): Promise<{ category: string; count: number }[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    outputFormat: "application/json",
    propertyName: "category",
  });

  if (cqlFilter) {
    params.append("CQL_FILTER", cqlFilter);
  }

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`WFS category count request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as VesselTableResponseApi;
  const counts = new Map<string, number>();
  data.features.forEach((feature) => {
    const category = String(feature.properties.category ?? "Unknown");
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchVesselTable(
  query: VesselTableQueryApi
): Promise<VesselTableResponseApi> {
  const startIndex = query.page * query.pageSize;

  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    outputFormat: "application/json",
    count: String(query.pageSize),
    startIndex: String(startIndex),
  });

  if (query.cqlFilter) {
    params.append("CQL_FILTER", query.cqlFilter);
  }

  if (query.sortBy) {
    const order = query.sortOrder === "desc" ? "D" : "A";
    params.append("sortBy", `${query.sortBy} ${order}`);
  }

  const url = `${WFS_URL}?${params.toString()}`;
  console.log("📡 WFS Table Request URL:", url);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WFS request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log("📡 WFS Table Response:", {
    totalFeatures: data.totalFeatures,
    numberMatched: data.numberMatched,
    numberReturned: data.numberReturned,
    featuresCount: data.features?.length,
  });
  
  return data;
}

export async function fetchUniqueColumnValues(column: string, limit: number = 10): Promise<string[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetPropertyValue",
    typeName: LAYER_NAME,
    valueReference: column,
    count: String(limit),
  });

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch unique values: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const values = new Set<string>();

  const members = xmlDoc.getElementsByTagName("wfs:member");
  for (let i = 0; i < members.length; i++) {
    const value = members[i].textContent?.trim();
    if (value) {
      values.add(value);
    }
  }

  return Array.from(values).slice(0, limit);
}

export async function searchColumnValues(column: string, query: string, limit: number = 10): Promise<string[]> {
  const cql = query
    ? `${column} ILIKE '%${query.replace(/'/g, "''")}%'`
    : undefined;
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    propertyName: column,
    outputFormat: "application/json",
    count: String(limit),
  });
  if (cql) params.set("CQL_FILTER", cql);

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to search column values: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as VesselTableResponseApi;
  const values = new Set<string>();
  for (const f of data.features) {
    const v = f.properties?.[column];
    if (v != null) values.add(String(v));
  }
  return Array.from(values).slice(0, limit);
}

export async function fetchVesselTableColumns(): Promise<string[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "DescribeFeatureType",
    typeName: LAYER_NAME,
  });

  const res = await fetch(`${WFS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch columns: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  
  const elements = xmlDoc.getElementsByTagName("xsd:element");
  const columns: string[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    const name = elements[i].getAttribute("name");
    if (name && name !== "geom") {
      columns.push(name);
    }
  }
  
  return columns;
}
