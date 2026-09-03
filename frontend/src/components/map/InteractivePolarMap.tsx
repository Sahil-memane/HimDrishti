import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  ANTARCTIC_CENTER,
  ANTARCTIC_DEFAULT_ZOOM,
  BASEMAP_STYLES,
  type TileStyleType,
  MAP_LAYERS,
} from './mapConfig';
import {
  initMapLayers,
  updateRouteGeoJSON,
  updateRiskZonesGeoJSON,
  updateIcebergsGeoJSON,
  updateVesselGeoJSON,
  setLayerGroupVisibility,
} from './MapLayerManager';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';

// Resolve MapLibre constructor safely across bundlers
const MapLibre = (maplibregl as any).Map ? maplibregl : (maplibregl as any);

export interface MapWaypoint {
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

export interface InteractivePolarMapProps {
  waypoints?: MapWaypoint[];
  vesselLat?: number;
  vesselLon?: number;
  vesselHeading?: number;
  vesselSpeed?: number;
  showSeaIce?: boolean;
  showIcebergs?: boolean;
  showRiskZones?: boolean;
  onToggleSeaIce?: (show: boolean) => void;
  onToggleIcebergs?: (show: boolean) => void;
  onToggleRiskZones?: (show: boolean) => void;
  activeRiskProfile?: string;
  onWaypointSelect?: (wp: MapWaypoint) => void;
  className?: string;
}

export const InteractivePolarMap: React.FC<InteractivePolarMapProps> = ({
  waypoints = [],
  vesselLat = -65.2,
  vesselLon = 70.4,
  vesselHeading = 45,
  vesselSpeed = 14.2,
  showSeaIce = true,
  showIcebergs = true,
  showRiskZones = true,
  onToggleSeaIce,
  onToggleIcebergs,
  onToggleRiskZones,
  onWaypointSelect,
  className = 'h-full w-full min-h-[450px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);

  const [activeTileType, setActiveTileType] = useState<TileStyleType>('satellite');
  const [isGlobe, setIsGlobe] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);

  // Fallback demo waypoints if none provided
  const activeWaypoints: MapWaypoint[] = waypoints.length > 0 ? waypoints : [
    { sequence_no: 1, lat: -60.0, lon: 40.0, eta: '2024-11-18T08:00', cumulative_fuel_l: 0, segment_risk_score: 0.12, risk_factors: { ice_risk: 0.05, iceberg_risk: 0.04, weather_risk: 0.03 } },
    { sequence_no: 2, lat: -65.2, lon: 70.4, eta: '2024-11-18T18:30', cumulative_fuel_l: 14200, segment_risk_score: 0.18, risk_factors: { ice_risk: 0.08, iceberg_risk: 0.05, weather_risk: 0.05 } },
    { sequence_no: 3, lat: -71.8, lon: 110.1, eta: '2024-11-19T10:15', cumulative_fuel_l: 38400, segment_risk_score: 0.45, risk_factors: { ice_risk: 0.22, iceberg_risk: 0.15, weather_risk: 0.08 } },
    { sequence_no: 4, lat: -77.846, lon: 166.6682, eta: '2024-11-20T14:00', cumulative_fuel_l: 84500, segment_risk_score: 0.24, risk_factors: { ice_risk: 0.10, iceberg_risk: 0.07, weather_risk: 0.05 } },
  ];

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapError) return;

    try {
      if (typeof MapLibre.supported === 'function' && !MapLibre.supported()) {
        console.warn('MapLibre GL is not supported in this browser context (WebGL hardware acceleration disabled).');
        setMapError(true);
        return;
      }

      const initialCenter: [number, number] = activeWaypoints[0]
        ? [activeWaypoints[0].lon, activeWaypoints[0].lat]
        : ANTARCTIC_CENTER;

      const map = new MapLibre.Map({
        container: mapContainerRef.current,
        style: BASEMAP_STYLES['satellite'],
        center: initialCenter,
        zoom: 3.2,
        attributionControl: false,
      });

      if (typeof map.setProjection === 'function') {
        try {
          map.setProjection({ type: 'globe' });
        } catch {
          // Ignore projection unsupported errors
        }
      }

      map.on('load', () => {
        initMapLayers(map);
        setMapLoaded(true);

        if (activeWaypoints.length > 0) {
          const bounds = new MapLibre.LngLatBounds();
          activeWaypoints.forEach((wp) => bounds.extend([wp.lon, wp.lat]));
          map.fitBounds(bounds, { padding: 80, maxZoom: 8, duration: 1000 });
        }
      });

      // Interactive Waypoint Popup Handler
      map.on('click', MAP_LAYERS.WAYPOINT_POINTS, (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const coordinates = (feature.geometry as any).coordinates.slice();

        const seq = props.sequence_no;
        const matchingWp = activeWaypoints.find((w) => w.sequence_no === seq);

        if (matchingWp && onWaypointSelect) {
          onWaypointSelect(matchingWp);
        }

        if (popupRef.current) popupRef.current.remove();

        const isStart = props.isStart;
        const isEnd = props.isEnd;
        const popupHtml = `
          <div style="
            background: rgba(7, 20, 32, 0.94);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 218, 243, 0.4);
            border-radius: 10px;
            padding: 12px 14px;
            color: #d7e4f5;
            font-family: 'Inter', sans-serif;
            min-width: 210px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          ">
            <div style="display: flex; justify-space: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-weight: 800; font-size: 13px; color: #00daf3;">WAYPOINT #${String(props.sequence_no).padStart(3, '0')}</span>
              <span style="font-family: monospace; font-size: 10px; color: #839493;">${isStart ? 'ORIGIN' : isEnd ? 'DEST' : 'WAYPOINT'}</span>
            </div>
            <div style="font-family: monospace; font-size: 11px; margin-bottom: 4px;">
              LAT/LON: <strong style="color: #fff;">${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}</strong>
            </div>
            ${props.eta ? `<div style="font-size: 11px; margin-bottom: 4px; color: #b9cac9;">ETA: <strong style="color: #fff;">${props.eta}</strong></div>` : ''}
            ${props.cumulative_fuel_l !== undefined ? `<div style="font-size: 11px; margin-bottom: 8px; color: #b9cac9;">Fuel Burn: <strong style="color: #35d4ff;">${Number(props.cumulative_fuel_l).toLocaleString()} L</strong></div>` : ''}
          </div>
        `;

        popupRef.current = new MapLibre.Popup({ closeButton: false, className: 'himdrishti-popup' })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);
      });

      // Cursor pointer hover effects
      map.on('mouseenter', MAP_LAYERS.WAYPOINT_POINTS, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', MAP_LAYERS.WAYPOINT_POINTS, () => {
        map.getCanvas().style.cursor = '';
      });

      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainerRef.current);

      mapRef.current = map;

      return () => {
        resizeObserver.disconnect();
        if (popupRef.current) popupRef.current.remove();
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('MapLibre GL initialization error, falling back to 2D polar chart view:', err);
      setMapError(true);
    }
  }, [mapError]);

  // Handle Basemap Style Switcher
  useEffect(() => {
    if (!mapRef.current || mapError) return;
    const map = mapRef.current;
    map.setStyle(BASEMAP_STYLES[activeTileType]);

    const handleStyleLoad = () => {
      initMapLayers(map);
      updateRouteGeoJSON(map, activeWaypoints);
      updateRiskZonesGeoJSON(map, showRiskZones, activeWaypoints);
      updateIcebergsGeoJSON(map, showIcebergs, activeWaypoints);
      updateVesselGeoJSON(map, vesselLat, vesselLon, vesselHeading, vesselSpeed);
    };

    map.once('style.load', handleStyleLoad);
  }, [activeTileType, mapError]);

  // Handle Projection Toggle
  useEffect(() => {
    if (!mapRef.current || mapError) return;
    if (typeof mapRef.current.setProjection === 'function') {
      try {
        mapRef.current.setProjection({ type: isGlobe ? 'globe' : 'mercator' });
      } catch {
        // Ignore projection errors
      }
    }
  }, [isGlobe, mapError]);

  // Update Map Sources & Layer Visibility when Props Change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || mapError) return;
    const map = mapRef.current;

    const startWp = activeWaypoints[0];
    const currentVesselLat = vesselLat ?? startWp?.lat ?? -65.2;
    const currentVesselLon = vesselLon ?? startWp?.lon ?? 70.4;

    updateRouteGeoJSON(map, activeWaypoints);
    updateRiskZonesGeoJSON(map, showRiskZones, activeWaypoints);
    updateIcebergsGeoJSON(map, showIcebergs, activeWaypoints);
    updateVesselGeoJSON(map, currentVesselLat, currentVesselLon, vesselHeading, vesselSpeed);

    setLayerGroupVisibility(map, [MAP_LAYERS.RISK_ZONES_FILL, MAP_LAYERS.RISK_ZONES_OUTLINE], showRiskZones);
    setLayerGroupVisibility(
      map,
      [MAP_LAYERS.ICEBERG_CLUSTERS, MAP_LAYERS.ICEBERG_CLUSTER_COUNT, MAP_LAYERS.ICEBERG_POINTS],
      showIcebergs
    );

    if (activeWaypoints.length > 0) {
      const bounds = new MapLibre.LngLatBounds();
      activeWaypoints.forEach((wp) => bounds.extend([wp.lon, wp.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 8, duration: 1000 });
    }
  }, [waypoints, showSeaIce, showIcebergs, showRiskZones, vesselLat, vesselLon, vesselHeading, vesselSpeed, mapLoaded, mapError]);

  const handleResetAntarctica = () => {
    if (!mapRef.current || mapError) return;
    mapRef.current.flyTo({
      center: ANTARCTIC_CENTER,
      zoom: ANTARCTIC_DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1500,
    });
  };

  const handleFitRoute = () => {
    if (!mapRef.current || activeWaypoints.length === 0 || mapError) return;
    const bounds = new MapLibre.LngLatBounds();
    activeWaypoints.forEach((wp) => bounds.extend([wp.lon, wp.lat]));
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 8, duration: 1200 });
  };

  const handleZoomIn = () => {
    if (mapRef.current && !mapError) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current && !mapError) mapRef.current.zoomOut();
  };

  // Dynamic 2D SVG Projection for Fallback GIS View
  const svgLats = activeWaypoints.map((w) => w.lat);
  const svgLons = activeWaypoints.map((w) => w.lon);
  const minLat = Math.min(...svgLats);
  const maxLat = Math.max(...svgLats);
  const minLon = Math.min(...svgLons);
  const maxLon = Math.max(...svgLons);

  const latSpan = maxLat - minLat || 1;
  const lonSpan = maxLon - minLon || 1;

  const projectSvg = (lat: number, lon: number) => {
    const x = 140 + ((lon - minLon) / lonSpan) * 720;
    const y = 480 - ((lat - minLat) / latSpan) * 360;
    return { x, y };
  };

  const svgPolylinePoints = activeWaypoints
    .map((wp) => {
      const p = projectSvg(wp.lat, wp.lon);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const sampledSvgWaypoints = activeWaypoints.filter(
    (_, idx) => idx === 0 || idx === activeWaypoints.length - 1 || idx % Math.ceil(activeWaypoints.length / 6) === 0
  );

  const vesselSvgPos = projectSvg(activeWaypoints[0]?.lat ?? -65.2, activeWaypoints[0]?.lon ?? 70.4);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#00daf3]/30 shadow-2xl ${className}`}>
      {/* MapLibre WebGL Canvas or Tactical 2D Vector Chart Fallback */}
      {!mapError ? (
        <div ref={mapContainerRef} className="h-full w-full z-0 bg-[#040C14]" />
      ) : (
        <div className="h-full w-full z-0 bg-[#040C14] relative overflow-hidden flex items-center justify-center">
          {/* Tactical Radar Grid Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30" pointerEvents="none">
            <defs>
              <radialGradient id="polarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00daf3" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#040c14" stopOpacity="0.9" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#polarGlow)" />
            <circle cx="50%" cy="50%" r="20%" stroke="#00daf3" strokeWidth="1" strokeDasharray="4,4" fill="none" />
            <circle cx="50%" cy="50%" r="35%" stroke="#00daf3" strokeWidth="1" strokeDasharray="6,6" fill="none" />
            <circle cx="50%" cy="50%" r="48%" stroke="#00daf3" strokeWidth="1.5" fill="none" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#00daf3" strokeWidth="0.8" strokeDasharray="4,4" />
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#00daf3" strokeWidth="0.8" strokeDasharray="4,4" />
          </svg>

          {/* Fallback Tactical Route Projection */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            {/* Risk Polygon */}
            {showRiskZones && (
              <polygon
                points="420,240 580,210 640,330 480,360"
                fill="#ff3333"
                fillOpacity="0.2"
                stroke="#ff3333"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            )}

            {/* Iceberg Anomaly Markers */}
            {showIcebergs && (
              <>
                <g transform="translate(490, 260)">
                  <circle r="8" fill="#ffaa00" opacity="0.8" />
                  <circle r="14" stroke="#ffaa00" strokeWidth="1.5" fill="none" opacity="0.5" />
                  <text x="12" y="4" fill="#ffaa00" fontSize="10" fontFamily="monospace" fontWeight="bold">B-15A ICEBERG</text>
                </g>
                <g transform="translate(560, 290)">
                  <circle r="8" fill="#ff3333" opacity="0.8" />
                  <circle r="14" stroke="#ff3333" strokeWidth="1.5" fill="none" opacity="0.5" />
                  <text x="12" y="4" fill="#ff3333" fontSize="10" fontFamily="monospace" fontWeight="bold">A-68A FRAGMENT</text>
                </g>
              </>
            )}

            {/* Tactical Route Line */}
            <polyline
              points={svgPolylinePoints}
              fill="none"
              stroke="#00daf3"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
            />
            <polyline
              points={svgPolylinePoints}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />

            {/* Waypoints */}
            {sampledSvgWaypoints.map((wp) => {
              const coords = projectSvg(wp.lat, wp.lon);
              const isStart = wp.sequence_no === activeWaypoints[0]?.sequence_no;
              const isEnd = wp.sequence_no === activeWaypoints[activeWaypoints.length - 1]?.sequence_no;
              const color = isStart ? '#39ff14' : isEnd ? '#ff3333' : '#00daf3';

              return (
                <g key={wp.sequence_no} transform={`translate(${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`} className="cursor-pointer" onClick={() => onWaypointSelect && onWaypointSelect(wp)}>
                  <circle r="9" fill={color} stroke="#ffffff" strokeWidth="2" />
                  <text x="14" y="4" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    WP#{String(wp.sequence_no).padStart(3, '0')} ({wp.lat.toFixed(1)}°, {wp.lon.toFixed(1)}°)
                  </text>
                </g>
              );
            })}

            {/* Vessel Position Marker */}
            <g transform={`translate(${vesselSvgPos.x.toFixed(1)}, ${vesselSvgPos.y.toFixed(1)})`}>
              <circle r="20" stroke="#00daf3" strokeWidth="1.5" fill="none" opacity="0.6">
                <animate attributeName="r" values="10;28;10" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#003543" stroke="#00daf3" strokeWidth="2.5" />
              <text x="-25" y="-14" fill="#00daf3" fontSize="11" fontFamily="monospace" fontWeight="bold">
                MV Antarctic Explorer ({vesselSpeed} KTS)
              </text>
            </g>
          </svg>

          {/* Tactical Fallback Banner */}
          <div className="absolute top-4 right-4 bg-[#071420]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00daf3]/40 flex items-center gap-2 text-xs font-mono text-[#00daf3] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#00daf3] animate-pulse" />
            <span>TACTICAL GIS POLAR CHART MODE</span>
          </div>
        </div>
      )}

      {/* Map Control Toolbar */}
      <MapControls
        activeTileType={activeTileType}
        onTileTypeChange={(type) => setActiveTileType(type)}
        isGlobe={isGlobe}
        onToggleGlobe={() => setIsGlobe(!isGlobe)}
        onResetAntarctica={handleResetAntarctica}
        onFitRoute={handleFitRoute}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        showSeaIce={showSeaIce}
        onToggleSeaIce={onToggleSeaIce}
        showIcebergs={showIcebergs}
        onToggleIcebergs={onToggleIcebergs}
        showRiskZones={showRiskZones}
        onToggleRiskZones={onToggleRiskZones}
      />

      {/* Map Legend Panel */}
      <MapLegend
        showSeaIce={showSeaIce}
        showIcebergs={showIcebergs}
        showRiskZones={showRiskZones}
      />
    </div>
  );
};
