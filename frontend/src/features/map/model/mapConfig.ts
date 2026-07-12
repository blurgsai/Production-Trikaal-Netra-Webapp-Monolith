import type { BaseMap, OverlayLayerConfig } from "../model/types";

const geoserverUrl = `${import.meta.env.VITE_GEOSERVER_BASE_URL}/${import.meta.env.VITE_GEOSERVER_WORKSPACE}/wms`;
const workspace = import.meta.env.VITE_GEOSERVER_WORKSPACE;

export const baseMaps: BaseMap[] = [
  {
    id: "dark",
    title: "Dark Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB",
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

export const overlayLayers: OverlayLayerConfig[] = [];

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
