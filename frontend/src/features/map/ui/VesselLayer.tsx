import { useMemo } from "react";
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

  // Memoized so the object reference is stable across re-renders (e.g. mousemove-driven
  // BaseMap re-renders) and only changes when the filter value itself changes. Otherwise
  // react-leaflet's WMSTileLayer compares params by reference and calls layer.setParams()
  // (which redraws/refetches the WMS tiles) on every render, causing the vessel layer to
  // continuously flicker/refetch whenever a CQL filter is active.
  const params = useMemo(
    () => (cqlFilter ? ({ CQL_FILTER: cqlFilter } as never) : undefined),
    [cqlFilter]
  );

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
