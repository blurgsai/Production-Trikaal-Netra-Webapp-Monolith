import { WMSTileLayer } from "react-leaflet";

interface VesselLayerProps {
  opacity: number;
  styleName: string;
  refreshKey: number;
  cqlFilter?: string;
}

function VesselLayer({ opacity, styleName, refreshKey, cqlFilter }: VesselLayerProps) {
  const geoserverUrl = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${
    import.meta.env.VITE_GEOSERVER_WORKSPACE
  }/wms`;

  const params = cqlFilter ? ({ CQL_FILTER: cqlFilter } as never) : undefined;
  
  console.log("🗺️ WMS Layer Debug:", {
    cqlFilter,
    params,
    hasFilter: !!cqlFilter,
    key: `vessel-${refreshKey}-${styleName}-${cqlFilter ?? "none"}`,
  });

  return (
    <WMSTileLayer
      key={`vessel-${refreshKey}-${styleName}-${cqlFilter ?? "none"}`}
      url={`${geoserverUrl}?cb=${refreshKey}`}
      layers={`${import.meta.env.VITE_GEOSERVER_WORKSPACE}:vessels`}
      {...(styleName ? { styles: styleName } : {})}
      format="image/png"
      transparent={true}
      opacity={opacity}
      zIndex={100}
      params={params}
    />
  );
}

export default VesselLayer;
