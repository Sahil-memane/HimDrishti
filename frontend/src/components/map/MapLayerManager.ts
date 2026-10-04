import type { Map, GeoJSONSource } from 'maplibre-gl';
import { MAP_SOURCES, MAP_LAYERS, GEBCO_BATHYMETRY_TILE_URL } from './mapConfig';
import { buildIcebergCircles } from '../../lib/geo';

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
    satellite_risk?: number;
  };
}

/** Real Model 3 SIC hard-block threshold (see backend cost.py) — ice at or
 * above this concentration is not navigable by a standard vessel. Used to
 * keep the map's visual hazard cues consistent with what the routing engine
 * actually enforces. */
export const SIC_BLOCK_THRESHOLD = 80;

/** Shared MapLibre data-driven color ramp for risk scores (0-1): green -> yellow -> orange -> red. */
const RISK_COLOR_EXPRESSION: any[] = [
  'interpolate',
  ['linear'],
  ['get', 'risk'],
  0.0, '#39ff14',
  0.3, '#ffcc00',
  0.6, '#ff8800',
  1.0, '#ff3333',
];

/**
 * Initialize all GeoJSON sources and vector/raster layers on the MapLibre instance.
 */
export function initMapLayers(map: Map): void {
  if (!map.getStyle()) return;

  // -1. Bathymetry (real GEBCO seafloor depth) — sits directly above the
  // basemap, below every data overlay, off by default (context layer).
  if (!map.getSource(MAP_SOURCES.BATHYMETRY)) {
    map.addSource(MAP_SOURCES.BATHYMETRY, {
      type: 'raster',
      tiles: [GEBCO_BATHYMETRY_TILE_URL],
      tileSize: 256,
      attribution: '&copy; GEBCO Compilation Group',
    });
  }

  if (!map.getLayer(MAP_LAYERS.BATHYMETRY)) {
    map.addLayer({
      id: MAP_LAYERS.BATHYMETRY,
      type: 'raster',
      source: MAP_SOURCES.BATHYMETRY,
      paint: { 'raster-opacity': 0.55 },
      layout: { visibility: 'none' },
    });
  }

  // 0. Sea Ice Source & Layers (Model 1)
  if (!map.getSource(MAP_SOURCES.SEA_ICE)) {
    map.addSource(MAP_SOURCES.SEA_ICE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.SEA_ICE)) {
    map.addLayer({
      id: MAP_LAYERS.SEA_ICE,
      type: 'fill',
      source: MAP_SOURCES.SEA_ICE,
      paint: {
        // Full LOW -> MODERATE -> HIGH concentration scale (0-100%), not
        // just a hazard-only cutoff — the Forecast page's job is to show
        // real ice conditions everywhere, not only where Model 3 would
        // block a route. Bands still align with the real SIC hard-block
        // threshold (80%, see cost.py) so HIGH visually matches what
        // routing actually treats as impassable.
        'fill-color': [
          'step',
          ['get', 'ice_concentration'],
          'rgba(56, 189, 248, 0.10)',   // 0-30%: LOW — open water / light ice
          30,
          'rgba(250, 204, 21, 0.20)',   // 30-65%: MODERATE
          65,
          'rgba(255, 170, 0, 0.30)',    // 65-80%: approaching hard-block
          SIC_BLOCK_THRESHOLD,
          'rgba(255, 51, 51, 0.45)',    // 80%+: HIGH — real routing hard-block
        ],
        'fill-outline-color': [
          'step',
          ['get', 'ice_concentration'],
          'rgba(56, 189, 248, 0.3)',
          30,
          'rgba(250, 204, 21, 0.4)',
          65,
          'rgba(255, 170, 0, 0.5)',
          SIC_BLOCK_THRESHOLD,
          'rgba(255, 51, 51, 0.8)',
        ],
      },
    });
  }

  // 1. Risk Zones Source & Layers (Background Fill & Outline under Route Line)
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
        'fill-opacity': 0.35,
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
        'line-width': 2,
        'line-dasharray': [4, 4],
      },
    });
  }

  // 2. Recommended Route Source & Layers (Rendered ON TOP of Risk Zone Fills)
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
        // Each route feature is one segment carrying its own real risk score,
        // so the glow (and the line below) genuinely show WHERE risk is
        // concentrated along the path instead of a single flat color.
        'line-color': RISK_COLOR_EXPRESSION as any,
        'line-width': 12,
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
        'line-color': RISK_COLOR_EXPRESSION as any,
        'line-width': 5,
        'line-opacity': 1.0,
      },
    });
  }



  // 2.5. Iceberg Confidence Circles — REAL geodesic polygons (true km radius
  // on the Earth's surface, built with @turf/circle), not MapLibre's
  // pixel-radius `circle` layer, which would be geographically wrong at
  // different zoom levels and latitudes. Fades with forecast horizon.
  if (!map.getSource(MAP_SOURCES.ICEBERG_CIRCLES)) {
    map.addSource(MAP_SOURCES.ICEBERG_CIRCLES, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_CIRCLES_FILL)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_CIRCLES_FILL,
      type: 'fill',
      source: MAP_SOURCES.ICEBERG_CIRCLES,
      paint: {
        'fill-color': '#ffaa00',
        // Day 1 = most confident/least uncertain -> more visible fill;
        // Day 7 = least confident -> fainter, matching real growing uncertainty.
        'fill-opacity': [
          'interpolate', ['linear'], ['get', 'horizon_day'],
          1, 0.30,
          7, 0.06,
        ] as any,
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_CIRCLES_OUTLINE)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_CIRCLES_OUTLINE,
      type: 'line',
      source: MAP_SOURCES.ICEBERG_CIRCLES,
      paint: {
        'line-color': '#ffaa00',
        'line-width': 1.5,
        'line-opacity': [
          'interpolate', ['linear'], ['get', 'horizon_day'],
          1, 0.7,
          7, 0.25,
        ] as any,
        'line-dasharray': [2, 2],
      },
    });
  }

  // 2.6. Iceberg Drift Vectors — real line from the last real-observed/
  // previous-day position to this horizon day's real predicted position
  // (see routes_forecast.py: haversine distance/bearing over two genuine
  // stored positions), with a rotated arrow glyph at the tip showing real
  // drift direction. Distinct from the confidence circle (uncertainty) and
  // the iceberg marker itself (predicted position).
  if (!map.getSource(MAP_SOURCES.ICEBERG_DRIFT_VECTORS)) {
    map.addSource(MAP_SOURCES.ICEBERG_DRIFT_VECTORS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_DRIFT_LINES)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_DRIFT_LINES,
      type: 'line',
      source: MAP_SOURCES.ICEBERG_DRIFT_VECTORS,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': '#7dd3fc',
        'line-width': 2,
        'line-opacity': 0.85,
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_DRIFT_ARROWS)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_DRIFT_ARROWS,
      type: 'symbol',
      source: MAP_SOURCES.ICEBERG_DRIFT_VECTORS,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'symbol-placement': 'point',
        'text-field': '➤',
        'text-size': 14,
        // Real bearing computed server-side from two genuine positions —
        // text-rotate expects degrees clockwise from north, matching the
        // bearing convention used in routes_forecast.py's _bearing_deg.
        'text-rotate': ['-', ['get', 'bearing'], 90],
        'text-rotation-alignment': 'map',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#7dd3fc',
        'text-halo-color': '#001a24',
        'text-halo-width': 1.5,
      },
    });
  }

  // 2.7. Iceberg Anchor (real last-observed track position) — the point the
  // drift vector originates from, visually distinct from the predicted
  // position so the two are never confused.
  if (!map.getSource(MAP_SOURCES.ICEBERG_ANCHORS)) {
    map.addSource(MAP_SOURCES.ICEBERG_ANCHORS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_ANCHOR_POINTS)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_ANCHOR_POINTS,
      type: 'circle',
      source: MAP_SOURCES.ICEBERG_ANCHORS,
      paint: {
        'circle-radius': 5,
        'circle-color': '#0ea5e9',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }

  // 3. Icebergs Source & Layers (With Clustering and Iceberg Icons)
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
        'circle-radius': ['step', ['get', 'point_count'], 20, 5, 26, 15, 32],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2.5,
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
        'text-field': '🧊 {point_count}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ICEBERG_POINTS)) {
    map.addLayer({
      id: MAP_LAYERS.ICEBERG_POINTS,
      type: 'symbol',
      source: MAP_SOURCES.ICEBERGS,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': '🧊',
        'text-size': 18,
        'text-allow-overlap': true,
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
          '#39ff14', // Vibrant Green for Origin
          ['get', 'isEnd'],
          '#ff3333', // Bright Red for Destination
          // Intermediate waypoints: colored by their real segment risk score
          // (same ramp as the route line) rather than a flat cyan.
          [
            'interpolate',
            ['linear'],
            ['get', 'segment_risk_score'],
            0.0, '#39ff14',
            0.3, '#ffcc00',
            0.6, '#ff8800',
            1.0, '#ff3333',
          ] as any,
        ],
        'circle-radius': [
          'case',
          ['get', 'isStart'],
          16,
          ['get', 'isEnd'],
          16,
          9, // Large 9px radius for all intermediate waypoints
        ],
        'circle-stroke-width': [
          'case',
          ['get', 'isStart'],
          3.5,
          ['get', 'isEnd'],
          3.5,
          2.5,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
        'circle-stroke-opacity': 1.0,
      },
    });
  }

  // 6. Dynamic Backend Alerts Source & Layer (Clean Alert Markers)
  if (!map.getSource(MAP_SOURCES.ALERTS)) {
    map.addSource(MAP_SOURCES.ALERTS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(MAP_LAYERS.ALERT_MARKERS)) {
    map.addLayer({
      id: MAP_LAYERS.ALERT_MARKERS,
      type: 'circle',
      source: MAP_SOURCES.ALERTS,
      paint: {
        'circle-color': [
          'match',
          ['get', 'severity'],
          'CRITICAL',
          '#f43f5e',
          'high',
          '#f43f5e',
          'WARNING',
          '#f59e0b',
          'medium',
          '#f59e0b',
          '#38bdf8',
        ],
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });
  }
}

/**
 * Update Sea Ice GeoJSON source (Model 1 output)
 * Filters out low-risk cells (< 60% concentration) so low-risk ocean remains clean.
 */
export function updateSeaIceGeoJSON(map: Map, showSeaIce: boolean, geojson?: any): void {
  const source = map.getSource(MAP_SOURCES.SEA_ICE) as GeoJSONSource | undefined;
  if (!source) return;

  if (!showSeaIce || !geojson || !geojson.features) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  // Only show cells approaching or past the real hard-block threshold (65%+)
  // so open ocean stays visually clear while genuinely hazardous ice is flagged.
  const highRiskFeatures = geojson.features.filter(
    (f: any) => (f.properties?.ice_concentration ?? 0) >= 65
  );

  source.setData({
    type: 'FeatureCollection',
    features: highRiskFeatures,
  });
}

/**
 * Update recommended route & waypoint GeoJSON sources (Model 3 output)
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

  // One LineString per segment, each carrying its own real segment_risk_score,
  // so the route line's color genuinely reflects where risk is concentrated
  // along the path instead of being a single flat color end to end.
  const segmentFeatures: any[] =
    waypoints.length < 2
      ? [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[Number(waypoints[0].lon), Number(waypoints[0].lat)], [Number(waypoints[0].lon), Number(waypoints[0].lat)]] },
            properties: { risk: Number(waypoints[0].segment_risk_score ?? 0) },
          },
        ]
      : waypoints.slice(1).map((wp, i) => {
          const prev = waypoints[i];
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[Number(prev.lon), Number(prev.lat)], [Number(wp.lon), Number(wp.lat)]],
            },
            properties: { risk: Number(wp.segment_risk_score ?? 0) },
          };
        });

  routeSource.setData({
    type: 'FeatureCollection',
    features: segmentFeatures,
  });

  // Waypoint Points (Sampled for optimal visibility and clickability)
  const step = waypoints.length > 30 ? Math.ceil(waypoints.length / 25) : 1;
  const sampledWaypoints = waypoints.filter(
    (_, idx) => idx === 0 || idx === waypoints.length - 1 || idx % step === 0
  );

  const waypointFeatures: any[] = sampledWaypoints.map((wp) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [Number(wp.lon), Number(wp.lat)],
    },
    properties: {
      sequence_no: Number(wp.sequence_no),
      isStart: wp.sequence_no === waypoints[0].sequence_no,
      isEnd: wp.sequence_no === waypoints[waypoints.length - 1].sequence_no,
      eta: wp.eta,
      cumulative_fuel_l: Number(wp.cumulative_fuel_l ?? 0),
      segment_risk_score: Number(wp.segment_risk_score ?? 0),
      ice_risk: Number(wp.risk_factors?.ice_risk ?? 0),
      iceberg_risk: Number(wp.risk_factors?.iceberg_risk ?? 0),
      weather_risk: Number(wp.risk_factors?.weather_risk ?? 0),
    },
  }));

  waypointSource.setData({
    type: 'FeatureCollection',
    features: waypointFeatures,
  });
}

/**
 * Update Risk Zones GeoJSON source
 * Displays high-risk areas (RED) and medium-risk areas (ORANGE) derived from actual model predictions.
 */
export function updateRiskZonesGeoJSON(map: Map, showRiskZones: boolean, _waypoints: MapWaypointData[], seaIceGeoJSON?: any): void {
  const source = map.getSource(MAP_SOURCES.RISK_ZONES) as GeoJSONSource | undefined;
  if (!source) return;

  if (!showRiskZones) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const features: any[] = [];

  // Render every cell at or above the real hard-block SIC threshold as a
  // hazard zone, anywhere on the map — real ice doesn't respect an arbitrary
  // latitude cutoff, and this route may run entirely north of -74 S.
  //
  // This used to fall back to drawing an invented ~1.6°x0.8° rectangle
  // around any waypoint with a high `risk_factors.ice_risk`, whenever no
  // real sea-ice GeoJSON was available. That risk_factors value can itself
  // come from a degraded backend run (Model 1 failed for this voyage), so
  // stacking a fabricated shape on top of an already-uncertain number
  // produced a confident-looking hazard zone that wasn't real ice data at
  // all — at worst a solid wall covering the whole visible map. Only ever
  // draw real Model 1 forecast cells here; if none are available, draw
  // nothing rather than invent geometry.
  if (seaIceGeoJSON && seaIceGeoJSON.features) {
    seaIceGeoJSON.features.forEach((f: any) => {
      const conc = f.properties?.ice_concentration ?? 0;
      if (conc >= SIC_BLOCK_THRESHOLD) {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            name: `CRITICAL ICE HAZARD ZONE (${conc.toFixed(0)}%, blocked >= ${SIC_BLOCK_THRESHOLD}%)`,
            riskLevel: 'HIGH',
            ice_concentration: conc,
          },
        });
      }
    });
  }

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

/**
 * Update Icebergs GeoJSON source (Model 2 output) — predicted positions,
 * confidence-radius circles, real last-observed anchor points, and real
 * drift vectors (anchor/previous-day -> this day's real predicted position).
 */
export function updateIcebergsGeoJSON(map: Map, showIcebergs: boolean, _waypoints: MapWaypointData[], liveGeoJSON?: any): void {
  const source = map.getSource(MAP_SOURCES.ICEBERGS) as GeoJSONSource | undefined;
  const circlesSource = map.getSource(MAP_SOURCES.ICEBERG_CIRCLES) as GeoJSONSource | undefined;
  const anchorsSource = map.getSource(MAP_SOURCES.ICEBERG_ANCHORS) as GeoJSONSource | undefined;
  const driftSource = map.getSource(MAP_SOURCES.ICEBERG_DRIFT_VECTORS) as GeoJSONSource | undefined;
  if (!source) return;

  const empty = { type: 'FeatureCollection' as const, features: [] };

  if (!showIcebergs) {
    source.setData(empty);
    circlesSource?.setData(empty);
    anchorsSource?.setData(empty);
    driftSource?.setData(empty);
    return;
  }

  if (liveGeoJSON && liveGeoJSON.features) {
    source.setData(liveGeoJSON);
    circlesSource?.setData(buildIcebergCircles(liveGeoJSON.features));

    // One real anchor point per iceberg (dedup — liveGeoJSON already holds
    // exactly one feature per iceberg for the selected day, so this is
    // effectively one-per-feature, just carrying only the anchor fields).
    const anchorFeatures: any[] = [];
    const driftFeatures: any[] = [];
    for (const f of liveGeoJSON.features) {
      const p = f.properties || {};
      if (p.anchor_lat == null || p.anchor_lon == null) continue;

      anchorFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.anchor_lon, p.anchor_lat] },
        properties: {
          iceberg_id: p.iceberg_id,
          anchor_observed_at: p.anchor_observed_at,
        },
      });

      if (p.prev_lat != null && p.prev_lon != null && p.drift_bearing_deg != null) {
        const dest = f.geometry?.coordinates;
        if (dest) {
          driftFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[p.prev_lon, p.prev_lat], dest],
            },
            properties: {
              iceberg_id: p.iceberg_id,
              drift_km_per_day: p.drift_km_per_day,
              bearing: p.drift_bearing_deg,
            },
          });
          // Arrow glyph placed at the destination end of the vector.
          driftFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: dest },
            properties: {
              iceberg_id: p.iceberg_id,
              drift_km_per_day: p.drift_km_per_day,
              bearing: p.drift_bearing_deg,
            },
          });
        }
      }
    }

    anchorsSource?.setData({ type: 'FeatureCollection', features: anchorFeatures });
    driftSource?.setData({ type: 'FeatureCollection', features: driftFeatures });
  } else {
    source.setData(empty);
    circlesSource?.setData(empty);
    anchorsSource?.setData(empty);
    driftSource?.setData(empty);
  }
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
  name: string = 'MV Antarctic Explorer',
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
      name,
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
 * Update dynamic backend alerts GeoJSON on map
 */
export function updateAlertsGeoJSON(map: Map, alerts?: any[]): void {
  const source = map.getSource(MAP_SOURCES.ALERTS) as GeoJSONSource | undefined;
  if (!source) return;

  if (!alerts || alerts.length === 0) {
    source.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const features: any[] = alerts
    .filter((a) => a.latitude != null && a.longitude != null)
    .map((a) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [a.longitude, a.latitude],
      },
      properties: {
        alert_id: a.alert_id,
        alert_type: a.alert_type,
        severity: a.severity || 'WARNING',
        title: a.title || a.alert_type.replace('_', ' '),
        message: a.message,
        source_model: a.source_model || 'system',
        risk_score: a.risk_score || 0,
        distance_from_route_km: a.distance_from_route_km || 0,
        route_waypoint: a.route_waypoint,
      },
    }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });
}

/**
 * Update (or remove) the real Sentinel-1 SAR quicklook image overlay.
 *
 * MapLibre `image` sources can't be created empty and later filled via
 * `setData` the way GeoJSON sources can — they need real coordinates up
 * front — so this removes and re-adds the source/layer on every call
 * instead. That's fine here: it only runs when a route's satellite
 * provenance changes (once per route calculation), not per frame.
 */
export function updateSarQuicklookImage(
  map: Map,
  show: boolean,
  bbox?: [number, number, number, number] | null,
  imageUrl?: string | null
): void {
  if (map.getLayer(MAP_LAYERS.SAR_QUICKLOOK)) {
    map.removeLayer(MAP_LAYERS.SAR_QUICKLOOK);
  }
  if (map.getSource(MAP_SOURCES.SAR_QUICKLOOK)) {
    map.removeSource(MAP_SOURCES.SAR_QUICKLOOK);
  }

  if (!show || !bbox || !imageUrl) return;

  const [minLon, minLat, maxLon, maxLat] = bbox;
  map.addSource(MAP_SOURCES.SAR_QUICKLOOK, {
    type: 'image',
    url: imageUrl,
    // MapLibre image source coordinates go clockwise from top-left: [TL, TR, BR, BL]
    coordinates: [
      [minLon, maxLat],
      [maxLon, maxLat],
      [maxLon, minLat],
      [minLon, minLat],
    ],
  } as any);

  map.addLayer({
    id: MAP_LAYERS.SAR_QUICKLOOK,
    type: 'raster',
    source: MAP_SOURCES.SAR_QUICKLOOK,
    paint: {
      'raster-opacity': 0.75,
    },
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
