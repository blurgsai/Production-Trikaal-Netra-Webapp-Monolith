import { WMSTileLayer, TileLayer } from "react-leaflet";
import { weatherLayers } from "../model/config";
import type { OverlayLayerConfig } from "../model/types";

interface MapOverlaysProps {
  activeLayers: Record<string, boolean>;
  orderedLayers: OverlayLayerConfig[];
}

function MapOverlays({ activeLayers, orderedLayers }: MapOverlaysProps) {
  const renderLayer = (layer: OverlayLayerConfig) => {
    if (!activeLayers[layer.id]) return null;

    if (layer.type === "wms") {
      return (
        <WMSTileLayer
          key={layer.id}
          url={layer.url!}
          layers={layer.layers}
          format="image/png"
          transparent={true}
          opacity={layer.opacity ?? 1}
          zIndex={layer.zIndex ?? 1}
          {...(layer.styles ? { styles: layer.styles } : {})}
        />
      );
    }

    return (
      <TileLayer
        key={layer.id}
        url={layer.url!}
        attribution={layer.attribution}
        opacity={layer.opacity ?? 1}
        zIndex={layer.zIndex ?? 1}
      />
    );
  };

  return (
    <>
      {orderedLayers.map(renderLayer)}
      {weatherLayers.map(renderLayer)}
    </>
  );
}

export default MapOverlays;
