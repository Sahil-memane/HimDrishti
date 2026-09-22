import type { StyleSpecification } from 'maplibre-gl';

export const ANTARCTIC_CENTER: [number, number] = [0, -75];
export const ANTARCTIC_DEFAULT_ZOOM = 2.8;

export type TileStyleType = 'satellite' | 'carto-dark' | 'carto-voyager';

// NASA GIBS MODIS Terra Corrected Reflectance (True Color) — genuine, near-daily
// updated satellite imagery. GIBS' WMTS REST API requires a real date in the
// {Time} path segment; the literal string "default" that was here previously
// is NOT a "latest available" alias — it silently resolves to a solid-black
// placeholder tile (verified: a 1.6KB single-color JPEG) instead of real
// imagery or a 404, which made the whole satellite basemap render as a black
// void. Using yesterday's UTC date instead (today's global composite is
// often still incomplete) reliably returns real, richly-detailed imagery.
function gibsDateStamp(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'gibs-truecolor': {
      type: 'raster',
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDateStamp()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 9,
      attribution: '&copy; NASA EOSDIS GIBS / MODIS Terra',
    },
  },
  layers: [
    {
      id: 'gibs-truecolor-layer',
      type: 'raster',
      source: 'gibs-truecolor',
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

export const MAP_SOURCES = {
  SEA_ICE: 'sea-ice',
  RISK_ZONES: 'risk-zones',
  ICEBERGS: 'icebergs',
  ICEBERG_CIRCLES: 'iceberg-circles',
  ICEBERG_ANCHORS: 'iceberg-anchors',
  ICEBERG_DRIFT_VECTORS: 'iceberg-drift-vectors',
  VESSELS: 'vessels',
  RECOMMENDED_ROUTE: 'recommended-route',
  WAYPOINTS: 'waypoints',
  ALERTS: 'alerts',
  BATHYMETRY: 'bathymetry',
  SAR_QUICKLOOK: 'sar-quicklook',
} as const;

export const MAP_LAYERS = {
  SEA_ICE: 'sea-ice-layer',
  RISK_ZONES_FILL: 'risk-zones-fill-layer',
  RISK_ZONES_OUTLINE: 'risk-zones-outline-layer',
  ICEBERG_CLUSTERS: 'iceberg-clusters',
  ICEBERG_CLUSTER_COUNT: 'iceberg-cluster-count',
  ICEBERG_POINTS: 'iceberg-points-layer',
  ICEBERG_CIRCLES_FILL: 'iceberg-circles-fill-layer',
  ICEBERG_CIRCLES_OUTLINE: 'iceberg-circles-outline-layer',
  ICEBERG_ANCHOR_POINTS: 'iceberg-anchor-points-layer',
  ICEBERG_DRIFT_LINES: 'iceberg-drift-lines-layer',
  ICEBERG_DRIFT_ARROWS: 'iceberg-drift-arrows-layer',
  VESSEL_PULSE: 'vessel-pulse-layer',
  VESSEL_POINT: 'vessel-point-layer',
  ROUTE_GLOW: 'recommended-route-glow',
  ROUTE_LINE: 'recommended-route-line',
  WAYPOINT_POINTS: 'waypoint-points-layer',
  WAYPOINT_LABELS: 'waypoint-labels-layer',
  ALERT_MARKERS: 'alert-markers-layer',
  ALERT_LABELS: 'alert-labels-layer',
  BATHYMETRY: 'bathymetry-layer',
  SAR_QUICKLOOK: 'sar-quicklook-layer',
} as const;

// GEBCO (General Bathymetric Chart of the Oceans) real seafloor depth data —
// free public WMS, no API key. Used as an optional context overlay, not a
// basemap replacement: real navigational depth/shelf-break context that the
// previous plain satellite/dark basemaps had no equivalent for.
export const GEBCO_BATHYMETRY_TILE_URL =
  'https://wms.gebco.net/mapserv?REQUEST=GetMap&SERVICE=WMS&VERSION=1.1.1&LAYERS=GEBCO_LATEST&FORMAT=image/png&TRANSPARENT=TRUE&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
