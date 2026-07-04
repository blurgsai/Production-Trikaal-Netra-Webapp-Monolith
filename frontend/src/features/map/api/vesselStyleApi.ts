interface SldAsset {
  resourceName: string;
  svgContent: string;
}

interface SldResult {
  sldXml: string;
  assets: SldAsset[];
}

const GEOSERVER_USER = import.meta.env.VITE_GEOSERVER_USER ?? "admin";
const GEOSERVER_PASS = import.meta.env.VITE_GEOSERVER_PASS ?? "geoserver";
const WORKSPACE = import.meta.env.VITE_GEOSERVER_WORKSPACE;

const REST_BASE = `${import.meta.env.VITE_GEOSERVER_REST_URL ?? import.meta.env.VITE_GEOSERVER_BASE_URL}/rest`;

function authHeader(): string {
  return "Basic " + btoa(`${GEOSERVER_USER}:${GEOSERVER_PASS}`);
}

async function uploadSvgResource(resourceName: string, svgContent: string): Promise<boolean> {
  const url = `${REST_BASE}/workspaces/${WORKSPACE}/styles/${resourceName}.svg`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/svg+xml", Authorization: authHeader() },
    body: svgContent,
  });

  if (res.status === 200 || res.status === 201) return true;

  const fallbackUrl = `${REST_BASE}/resource/styles/${resourceName}.svg`;
  const fallbackRes = await fetch(fallbackUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/svg+xml", Authorization: authHeader() },
    body: svgContent,
  });

  return fallbackRes.status === 200 || fallbackRes.status === 201;
}

async function createGeoserverStyle(styleName: string, sldXml: string): Promise<void> {
  await fetch(`${REST_BASE}/styles/${styleName}`, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  }).catch(() => {});

  const createUrl = `${REST_BASE}/styles?name=${styleName}`;
  const res = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/vnd.ogc.sld+xml", Authorization: authHeader() },
    body: sldXml,
  });

  if (res.status !== 200 && res.status !== 201) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create GeoServer style: ${res.status} ${text}`);
  }
}

async function clearGeoserverCache(): Promise<void> {
  await fetch(`${REST_BASE}/reset`, {
    method: "PUT",
    headers: { Authorization: authHeader() },
  }).catch(() => {});
}

export async function validateStyleExists(styleName: string): Promise<boolean> {
  if (!styleName) return false;
  try {
    const res = await fetch(`${REST_BASE}/styles/${styleName}.json`, {
      headers: { Authorization: authHeader() },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function applyVesselStyle(styleName: string, sld: SldResult): Promise<string> {
  const finalStyleName = styleName || `user_vessel_style_${Date.now()}`;

  for (const asset of sld.assets) {
    await uploadSvgResource(asset.resourceName, asset.svgContent);
  }

  await createGeoserverStyle(finalStyleName, sld.sldXml);
  await clearGeoserverCache();

  return finalStyleName;
}
