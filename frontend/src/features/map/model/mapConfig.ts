import type { BaseMap, OverlayLayerConfig } from "../model/types";

const geoserverUrl = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${import.meta.env.VITE_GEOSERVER_WORKSPACE}/wms`;
const workspace = import.meta.env.VITE_GEOSERVER_WORKSPACE;

export const baseMaps: BaseMap[] = [
  {
    id: "osm",
    title: "Light Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  {
    id: "dark",
    title: "Dark Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB",
  },
  {
    id: "satellite",
    title: "Satellite Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
];

export const defaultBaseMap = baseMaps[0];

export const indiaBoundaryLayer: OverlayLayerConfig = {
  id: "india_boundary",
  title: "India Boundary",
  type: "wms",
  url: geoserverUrl,
  layers: `${workspace}:india_boundary`,
  styles: "line",
  opacity: 1,
  zIndex: 5,
};

export const overlayLayers: OverlayLayerConfig[] = [
  {
    id: "ne_10m_coastline",
    title: "Demarcated Coastline",
    type: "wms",
    url: geoserverUrl,
    layers: `${workspace}:ne_10m_coastline`,
    opacity: 1,
    zIndex: 1,
  },
  {
    id: "density_layer",
    title: "Density Layer",
    type: "tile",
    url: "https://density-layer-tiles-760940605140.asia-south1.run.app/{z}/{x}/{y}.png",
    attribution: "Density Layer",
    opacity: 0.7,
    zIndex: 2,
  },
  {
    id: "sea_lanes",
    title: "Sea Lanes",
    type: "wms",
    url: geoserverUrl,
    layers: `${workspace}:Shipping-Lanes-v1`,
    opacity: 1,
    zIndex: 2,
  },
];

export const weatherLayers: OverlayLayerConfig[] = [
  {
    id: "clouds_new",
    title: "Clouds",
    type: "tile",
    url: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=f16958f6daeae7e38ee62cf6cb6f9ecd",
    opacity: 0.7,
    zIndex: 50,
  },
  {
    id: "precipitation_new",
    title: "Precipitation",
    type: "tile",
    url: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=f16958f6daeae7e38ee62cf6cb6f9ecd",
    opacity: 0.7,
    zIndex: 50,
  },
  {
    id: "pressure_new",
    title: "Pressure",
    type: "tile",
    url: "https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=f16958f6daeae7e38ee62cf6cb6f9ecd",
    opacity: 0.7,
    zIndex: 50,
  },
  {
    id: "wind_new",
    title: "Wind",
    type: "tile",
    url: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=f16958f6daeae7e38ee62cf6cb6f9ecd",
    opacity: 0.7,
    zIndex: 50,
  },
  {
    id: "temp_new",
    title: "Temperature",
    type: "tile",
    url: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=f16958f6daeae7e38ee62cf6cb6f9ecd",
    opacity: 0.7,
    zIndex: 50,
  },
];

export const defaultActiveLayers: Record<string, boolean> = {};
