import { useEffect, useState } from "react";
import { WMSTileLayer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-kml";
import "leaflet.vectorgrid";
import { weatherLayers } from "../model/config";
import type { OverlayLayerConfig } from "../model/types";

interface MapOverlaysProps {
  activeLayers: Record<string, boolean>;
  orderedLayers: OverlayLayerConfig[];
  flyToBounds?: [number, number, number, number] | null;
  onFlyDone?: () => void;
}

function GeoJsonOverlay({ layer }: { layer: OverlayLayerConfig }) {
  const [data, setData] = useState<GeoJSON.GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(layer.url!)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json as GeoJSON.GeoJsonObject);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => { cancelled = true; };
  }, [layer.url]);

  if (!data) return null;

  return (
    <GeoJSON
      key={layer.id}
      data={data}
      style={{
        color: layer.color || "#3388ff",
        weight: 2,
        opacity: layer.opacity ?? 1,
        fillOpacity: (layer.opacity ?? 1) * 0.3,
      }}
    />
  );
}

function KmlOverlay({ layer }: { layer: OverlayLayerConfig }) {
  const [geojson, setGeojson] = useState<GeoJSON.GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(layer.url!)
      .then((res) => res.text())
      .then((kmlText) => {
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlText, "text/xml");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const LKml = (L as any).KML;
        const geojsonObj = LKml ? LKml(kmlDoc) : null;
        if (!cancelled && geojsonObj) {
          setGeojson(geojsonObj.toGeoJSON() as GeoJSON.GeoJsonObject);
        }
      })
      .catch(() => {
        if (!cancelled) setGeojson(null);
      });
    return () => { cancelled = true; };
  }, [layer.url]);

  if (!geojson) return null;

  return (
    <GeoJSON
      key={layer.id}
      data={geojson}
      style={{
        color: layer.color || "#3388ff",
        weight: 2,
        opacity: layer.opacity ?? 1,
        fillOpacity: (layer.opacity ?? 1) * 0.3,
      }}
    />
  );
}

function MvtOverlay({ layer }: { layer: OverlayLayerConfig }) {
  const map = useMap();

  useEffect(() => {
    if (!layer.url) return;

    const baseStyle: L.PathOptions = {
      color: layer.color || "#3388ff",
      weight: 2,
      opacity: layer.opacity ?? 1,
      fillOpacity: (layer.opacity ?? 1) * 0.3,
      fillColor: layer.color || "#3388ff",
    };

    // If specific layer names are provided, style each one.
    // Otherwise use a function that applies the base style to all layers.
    const layerNames = layer.layers
      ? layer.layers.split(",").map((l) => l.trim())
      : [];

    const vectorTileLayerStyles = layerNames.length > 0
      ? Object.fromEntries(layerNames.map((ln) => [ln, baseStyle]))
      : baseStyle;

    const LExt = L as unknown as { vectorGrid: { protobuf: (...args: unknown[]) => L.Layer }; canvas: { tile: unknown } };
    const vectorGrid = LExt.vectorGrid.protobuf(layer.url, {
      rendererFactory: LExt.canvas.tile as unknown,
      vectorTileLayerStyles,
      interactive: true,
      zIndex: layer.zIndex ?? 1,
    });

    vectorGrid.addTo(map);

    return () => {
      map.removeLayer(vectorGrid);
    };
  }, [map, layer.url, layer.layers, layer.color, layer.opacity, layer.zIndex]);

  return null;
}

function FlyToBounds({ bounds, onDone }: { bounds: [number, number, number, number] | null; onDone?: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    const [minLon, minLat, maxLon, maxLat] = bounds;
    map.flyToBounds(
      L.latLngBounds(L.latLng(minLat, minLon), L.latLng(maxLat, maxLon)),
      { animate: true, duration: 1.5, padding: [50, 50] }
    );
    onDone?.();
  }, [bounds]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MapOverlays({ activeLayers, orderedLayers, flyToBounds, onFlyDone }: MapOverlaysProps) {
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

    if (layer.type === "mvt") {
      return <MvtOverlay key={layer.id} layer={layer} />;
    }

    if (layer.type === "geojson") {
      return <GeoJsonOverlay key={layer.id} layer={layer} />;
    }

    if (layer.type === "kml") {
      return <KmlOverlay key={layer.id} layer={layer} />;
    }

    return (
      <TileLayer
        key={layer.id}
        url={layer.url!}
        attribution={layer.attribution}
        opacity={layer.opacity ?? 1}
        zIndex={layer.zIndex ?? 1}
        tileSize={layer.isENC ? 512 : 256}
        zoomOffset={layer.isENC ? -1 : 0}
      />
    );
  };

  return (
    <>
      <FlyToBounds bounds={flyToBounds ?? null} onDone={onFlyDone} />
      {orderedLayers.map(renderLayer)}
      {weatherLayers.map(renderLayer)}
    </>
  );
}

export default MapOverlays;
