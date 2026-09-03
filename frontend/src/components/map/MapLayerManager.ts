import type { Map, GeoJSONSource } from 'maplibre-gl';
import { MAP_SOURCES, MAP_LAYERS } from './mapConfig';

export interface MapWaypointData {
  sequence_no: number;
  lat: number;
  lon: number;
  eta?: string;
  cumulative_fuel_l?: number;
  segment_risk_score?: number;
  risk_factors?: {
    ice_risk: number;
    iceberg_risk: number;
    weather_risk: number;
  };
}

/**
 * Initialize all GeoJSON sources and vector/raster layers on the MapLibre instance.
 */
export function initMapLayers(map: Map): void {
  if (!map.isStyleLoaded()) return;

  // 1. Recommended Route Source & Layers
  if (!map.getSource(MAP_SOURCES.RECOMMENDED_ROUTE)) {
    map.addSource(MAP_SOURCES.RECOMMENDED_ROUTE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ROUTE_GLOW)) {
    map.addLayer({
      id: MAP_LAYERS.ROUTE_GLOW,
      type: 'line',
      source: MAP_SOURCES.RECOMMENDED_ROUTE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#00daf3',
        'line-width': 10,
        'line-opacity': 0.35,
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ROUTE_LINE)) {
    map.addLayer({
      id: MAP_LAYERS.ROUTE_LINE,
      type: 'line',
      source: MAP_SOURCES.RECOMMENDED_ROUTE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.95,
      },
    });
  }

  // 2. Risk Zones Source & Layers
  if (!map.getSource(MAP_SOURCES.RISK_ZONES)) {
    map.addSource(MAP_SOURCES.RISK_ZONES, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.RISK_ZONES_FILL)) {
    map.addLayer({
      id: MAP_LAYERS.RISK_ZONES_FILL,
      type: 'fill',
      source: MAP_SOURCES.RISK_ZONES,
      paint: {
        'fill-color': '#ff3333',
        'fill-opacity': 0.25,
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.RISK_ZONES_OUTLINE)) {
    map.addLayer({
      id: MAP_LAYERS.RISK_ZONES_OUTLINE,
      type: 'line',
      source: MAP_SOURCES.RISK_ZONES,
      paint: {
        'line-color': '#ff3333',
        'line-width': 1.5,
        'line-dasharray': [4, 4],
      },
    });
  }

  // 3. Icebergs Source & Layers (With Clustering)
  if (!map.getSource(MAP_SOURCES.ICEBERGS)) {
    map.addSource(MAP_SOURCES.ICEBERGS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 7,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_CLUSTERS)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_CLUSTERS,
      type: 'circle',
      source: MAP_SOURCES.ICEBERGS,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#ffaa00',
        'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_CLUSTER_COUNT)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_CLUSTER_COUNT,
      type: 'symbol',
      source: MAP_SOURCES.ICEBERGS,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#000000',
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_POINTS)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_POINTS,
      type: 'circle',
      source: MAP_SOURCES.ICEBERGS,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#ffaa00',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }

  // 4. Vessel Source & Layers
  if (!map.getSource(MAP_SOURCES.VESSELS)) {
    map.addSource(MAP_SOURCES.VESSELS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.VESSEL_PULSE)) {
    map.addLayer({
      id: MAP_LAYERS.VESSEL_PULSE,
      type: 'circle',
      source: MAP_SOURCES.VESSELS,
      paint: {
        'circle-color': '#00daf3',
        'circle-radius': 16,
        'circle-opacity': 0.25,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#00daf3',
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.VESSEL_POINT)) {
    map.addLayer({
      id: MAP_LAYERS.VESSEL_POINT,
      type: 'circle',
      source: MAP_SOURCES.VESSELS,
      paint: {
        'circle-color': '#003543',
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#00daf3',
      },
    });
  }

  // 5. Waypoints Source & Layers
  if (!map.getSource(MAP_SOURCES.WAYPOINTS)) {
    map.addSource(MAP_SOURCES.WAYPOINTS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.WAYPOINT_POINTS)) {
    map.addLayer({
      id: MAP_LAYERS.WAYPOINT_POINTS,
      type: 'circle',
      source: MAP_SOURCES.WAYPOINTS,
      paint: {
        'circle-color': [
          'case',
          ['get', 'isStart'],
          '#39ff14',
          ['get', 'isEnd'],
          '#ff3333',
          '#00daf3',
        ],
        'circle-radius': 10,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

/**
 * Update recommended route & waypoint GeoJSON sources
 */
export function updateRouteGeoJSON(map: Map, waypoints: MapWaypointData[]): void {
  const routeSource = map.getSource(MAP_SOURCES.RECOMMENDED_ROUTE) as GeoJSONSource | undefined;
  const waypointSource = map.getSource(MAP_SOURCES.WAYPOINTS) as GeoJSONSource | undefined;

  if (!routeSource || !waypointSource) return;

  if (waypoints.length === 0) {
    routeSource.setData({ type: 'FeatureCollection', features: [] });
    waypointSource.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  // LineString (lon, lat)
  const lineCoords: [number, number][] = waypoints.map((wp) => [wp.lon, wp.lat]);
  const routeFeature: any = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: lineCoords,
    },
    properties: {},
  };

  routeSource.setData({
    type: 'FeatureCollection',
    features: [routeFeature],
  });

  // Waypoint Points (sample intermediate nodes for clean UI display when path is dense)
  const step = waypoints.length > 20 ? Math.ceil(waypoints.length / 8) : 1;
  const sampledWaypoints = waypoints.filter(
    (_, idx) => idx === 0 || idx === waypoints.length - 1 || idx % step === 0
  );

  const waypointFeatures: any[] = sampledWaypoints.map((wp) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [wp.lon, wp.lat],
    },
    properties: {
      sequence_no: wp.sequence_no,
      isStart: wp.sequence_no === waypoints[0].sequence_no,
      isEnd: wp.sequence_no === waypoints[waypoints.length - 1].sequence_no,
      eta: wp.eta,
      cumulative_fuel_l: wp.cumulative_fuel_l,
      segment_risk_score: wp.segment_risk_score,
      ice_risk: wp.risk_factors?.ice_risk,
      iceberg_risk: wp.risk_factors?.iceberg_risk,
      weather_risk: wp.risk_factors?.weather_risk,
    },
  }));

  waypointSource.setData({
    type: 'FeatureCollection',
    features: waypointFeatures,
  });
}

/**
 * Update Risk Zones GeoJSON source
 */
export function updateRiskZonesGeoJSON(map: Map, showRiskZones: boolean, waypoints: MapWaypointData[]): void {
  const source = map.getSource(MAP_SOURCES.RISK_ZONES) as GeoJSONSource | undefined;
  if (!source) return;

  if (!showRiskZones || waypoints.length < 3) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const p1 = waypoints[1];
  const p2 = waypoints[2];
  const zonePolygon: any = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [p1.lon - 2.0, p1.lat + 0.8],
          [p1.lon + 4.5, p1.lat + 2.2],
          [p2.lon + 3.0, p2.lat + 1.5],
          [p2.lon - 1.5, p2.lat - 1.0],
          [p1.lon - 2.0, p1.lat + 0.8],
        ],
      ],
    },
    properties: {
      name: 'CRITICAL ICE CONSOLIDATION ZONE (SIC > 85%)',
      riskLevel: 'HIGH',
    },
  };

  source.setData({
    type: 'FeatureCollection',
    features: [zonePolygon],
  });
}

/**
 * Update Icebergs GeoJSON source
 */
export function updateIcebergsGeoJSON(map: Map, showIcebergs: boolean, waypoints: MapWaypointData[]): void {
  const source = map.getSource(MAP_SOURCES.ICEBERGS) as GeoJSONSource | undefined;
  if (!source) return;

  if (!showIcebergs || waypoints.length < 2) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const midWp = waypoints[Math.floor(waypoints.length / 2)];
  const icebergFeatures: any[] = [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [midWp.lon - 3.2, midWp.lat + 0.6],
      },
      properties: {
        id: 'B-15A',
        name: 'DRIFTING ICEBERG ANOMALY B-15A',
        driftRate: '1.8 KTS',
        riskLevel: 'HIGH',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [midWp.lon - 1.5, midWp.lat + 1.2],
      },
      properties: {
        id: 'A-68A',
        name: 'ICEBERG A-68A FRAGMENT',
        driftRate: '2.1 KTS',
        riskLevel: 'CRITICAL',
      },
    },
  ];

  source.setData({
    type: 'FeatureCollection',
    features: icebergFeatures,
  });
}

/**
 * Update Vessel GeoJSON source
 */
export function updateVesselGeoJSON(
  map: Map,
  vesselLat?: number,
  vesselLon?: number,
  heading: number = 45,
  speed: number = 14.2,
  defaultLat: number = -65.2,
  defaultLon: number = 70.4
): void {
  const source = map.getSource(MAP_SOURCES.VESSELS) as GeoJSONSource | undefined;
  if (!source) return;

  const lat = vesselLat ?? defaultLat;
  const lon = vesselLon ?? defaultLon;

  const vesselFeature: any = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    properties: {
      name: 'MV Antarctic Explorer',
      heading,
      speed,
    },
  };

  source.setData({
    type: 'FeatureCollection',
    features: [vesselFeature],
  });
}

/**
 * Safely toggle MapLibre layer visibility
 */
export function setLayerGroupVisibility(map: Map, layerIds: string[], visible: boolean): void {
  layerIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}
