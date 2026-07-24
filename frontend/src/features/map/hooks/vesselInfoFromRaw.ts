import type { VesselInfo } from "../model/types";
import { mapRawVesselToInfo } from "../model/mappers";

/** Maps a vessel table row (or raw feature props) into domain VesselInfo. */
export function vesselInfoFromRaw(
  raw: Record<string, unknown> & { id?: string | number },
): VesselInfo | null {
  return mapRawVesselToInfo(raw);
}
