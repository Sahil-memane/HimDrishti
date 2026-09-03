import type { StyleSpecification } from 'maplibre-gl';

export const ANTARCTIC_CENTER: [number, number] = [0, -75];
export const ANTARCTIC_DEFAULT_ZOOM = 2.8;

export type TileStyleType = 'satellite' | 'carto-dark' | 'carto-voyager';

// Esri World Imagery Raster Basemap Style for MapLibre
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Tactical Dark Mode Basemap Style (Esri World Dark Gray Canvas — Free, No Key Required)
export const TACTICAL_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '&copy; Esri, HERE, Garmin, USGS',
    },
  },
  layers: [
    {
      id: 'esri-dark-layer',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Voyager / Ocean Basemap Style (Esri World Ocean Base — Free, No Key Required)
export const VOYAGER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-ocean': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '&copy; Esri, GEBCO, NOAA, National Geographic',
    },
  },
  layers: [
    {
      id: 'esri-ocean-layer',
      type: 'raster',
      source: 'esri-ocean',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const BASEMAP_STYLES: Record<TileStyleType, StyleSpecification> = {
  'satellite': SATELLITE_STYLE,
  'carto-dark': TACTICAL_DARK_STYLE,
  'carto-voyager': VOYAGER_STYLE,
};

// Source & Layer Identifiers
export const MAP_SOURCES = {
  SEA_ICE: 'sea-ice',
  RISK_ZONES: 'risk-zones',
  ICEBERGS: 'icebergs',
  VESSELS: 'vessels',
  RECOMMENDED_ROUTE: 'recommended-route',
  WAYPOINTS: 'waypoints',
} as const;

export const MAP_LAYERS = {
  SEA_ICE: 'sea-ice-layer',
  RISK_ZONES_FILL: 'risk-zones-fill-layer',
  RISK_ZONES_OUTLINE: 'risk-zones-outline-layer',
  ICEBERG_CLUSTERS: 'iceberg-clusters',
  ICEBERG_CLUSTER_COUNT: 'iceberg-cluster-count',
  ICEBERG_POINTS: 'iceberg-points-layer',
  VESSEL_PULSE: 'vessel-pulse-layer',
  VESSEL_POINT: 'vessel-point-layer',
  ROUTE_GLOW: 'recommended-route-glow',
  ROUTE_LINE: 'recommended-route-line',
  WAYPOINT_POINTS: 'waypoint-points-layer',
  WAYPOINT_LABELS: 'waypoint-labels-layer',
} as const;
