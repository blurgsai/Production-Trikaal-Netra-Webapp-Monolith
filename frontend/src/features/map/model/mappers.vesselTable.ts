import type { VesselTableResponseApi, VesselTableFeatureApi } from "../api/vesselTableApi";
import type { VesselTableRow } from "./types";

export interface VesselTablePage {
  rows: VesselTableRow[];
  total: number;
  returned: number;
}

export function mapVesselTableResponse(response: VesselTableResponseApi): VesselTablePage {
  return {
    rows: response.features.map(mapVesselTableFeature),
    total: response.numberMatched ?? response.totalFeatures ?? 0,
    returned: response.numberReturned ?? response.features.length,
  };
}

function mapVesselTableFeature(feature: VesselTableFeatureApi): VesselTableRow {
  return {
    id: feature.id,
    properties: feature.properties,
  };
}
