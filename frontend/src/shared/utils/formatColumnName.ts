const COLUMN_NAME_MAP: Record<string, string> = {
  identification_mmsi: "MMSI",
  identification_imo: "IMO",
  identification_shipname: "Ship Name",
  navigationstatus: "Navigation Status",
  status_navstatusparsed: "Status (Parsed)",
  location_current_lat: "Latitude",
  location_current_lon: "Longitude",
  speed_current_consensusvalue: "Speed (Consensus)",
  heading_current_consensusvalue: "Heading (Consensus)",
  kinematics_speedovergroundmps: "Speed Over Ground",
  voyage_destination: "Destination",
  servicestatus: "Service Status",
  operational_dteflag: "DTE Flag",
  status_suspicious: "Suspicious",
};

export function formatColumnName(column: string): string {
  return (
    COLUMN_NAME_MAP[column] ||
    column.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
