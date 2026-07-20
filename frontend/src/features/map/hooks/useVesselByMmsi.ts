import { useState, useEffect } from "react";
import { fetchVesselByMmsi } from "../api/vesselInfoApi";
import type { VesselInfo } from "../model/types";

export function useVesselByMmsi(mmsi: string | undefined): VesselInfo | null {
  const [vessel, setVessel] = useState<VesselInfo | null>(null);

  useEffect(() => {
    if (!mmsi) {
      setVessel(null);
      return;
    }

    let cancelled = false;
    fetchVesselByMmsi(mmsi).then((raw) => {
      if (cancelled || !raw) {
        setVessel(null);
        return;
      }

      // Inline mapper to avoid feature-internal import violations
      const id = String(raw.id ?? raw.vessel_id ?? "");
      const lat = Number(raw.location_current_lat);
      const lon = Number(raw.location_current_lon);
      const heading = Number(raw.heading_current_consensusvalue);
      const speed = Number(raw.speed_current_consensusvalue);

      if (!id || isNaN(lat) || isNaN(lon) || isNaN(heading) || isNaN(speed)) {
        setVessel(null);
        return;
      }

      setVessel({
        id,
        locationCurrentLat: lat,
        locationCurrentLon: lon,
        headingCurrentConsensusValue: heading,
        speedCurrentConsensusValue: speed,
        name: (raw.identification_shipname ?? raw.name ?? raw.vessel_name) as string | undefined,
        mmsi: (raw.identification_mmsi ?? raw.mmsi) as string | undefined,
        imo: (raw.identification_imo ?? raw.imo) as string | undefined,
        rawProperties: raw,
      });
    });

    return () => { cancelled = true; };
  }, [mmsi]);

  return vessel;
}
