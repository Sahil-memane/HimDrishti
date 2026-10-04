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
  updateSeaIceGeoJSON,
  updateVesselGeoJSON,
  updateAlertsGeoJSON,
  updateSarQuicklookImage,
  setLayerGroupVisibility,
} from './MapLayerManager';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { api } from '../../services/api';
import { latToDegMin, lonToDegMin } from '../../lib/geo';

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
    satellite_risk?: number;
  };
}

export interface InteractivePolarMapProps {
  waypoints?: MapWaypoint[];
  alerts?: any[];
  vesselLat?: number;
  vesselLon?: number;
  vesselHeading?: number;
  vesselSpeed?: number;
  /** The actually-selected vessel's real name (from the voyage's vessel_id) — not a fixed demo vessel. */
  vesselName?: string;
  showSeaIce?: boolean;
  showIcebergs?: boolean;
  /** Show real iceberg last-known-position + drift-vector detail layers. Off by default — this is forecast-analysis detail, not needed on the route-decision (Dashboard) map. */
  showIcebergDrift?: boolean;
  showRiskZones?: boolean;
  showBathymetry?: boolean;
  showSarQuicklook?: boolean;
  onToggleSeaIce?: (show: boolean) => void;
  onToggleIcebergs?: (show: boolean) => void;
  onToggleRiskZones?: (show: boolean) => void;
  onToggleBathymetry?: (show: boolean) => void;
  onToggleSarQuicklook?: (show: boolean) => void;
  /** Real Sentinel-1 scene bbox + freshly-signed quicklook image URL, from the route's data_provenance. */
  sarBbox?: [number, number, number, number] | null;
  sarImageUrl?: string | null;
  activeRiskProfile?: string;
  /** Forecast horizon day (1-7) used to fetch the sea-ice/iceberg forecast layers. Defaults to day 1 (today). */
  horizonDay?: number;
  /** Active voyage — scopes the sea-ice forecast fetch to this voyage's own Model 1 run instead of whichever voyage most recently overwrote the shared table. */
  voyageId?: string | null;
  onWaypointSelect?: (wp: MapWaypoint) => void;
  /** Called with the real fetched forecast GeoJSON whenever it refreshes, so parent pages can show real summary stats instead of fabricated ones. */
  onForecastLoaded?: (seaIce: any, icebergs: any) => void;
  className?: string;
}

export const InteractivePolarMap: React.FC<InteractivePolarMapProps> = ({
  waypoints = [],
  alerts = [],
  vesselLat = -60.0,
  vesselLon = 40.0,
  vesselHeading = 45,
  vesselSpeed = 12.5,
  vesselName = 'MV Antarctic Explorer',
  showSeaIce = false,
  showIcebergs = true,
  showIcebergDrift = false,
  showRiskZones = true,
  showBathymetry = false,
  showSarQuicklook = false,
  onToggleSeaIce,
  onToggleIcebergs,
  onToggleRiskZones,
  onToggleBathymetry,
  onToggleSarQuicklook,
  sarBbox = null,
  sarImageUrl = null,
  horizonDay = 1,
  voyageId = null,
  onWaypointSelect,
  onForecastLoaded,
  className = 'h-full w-full min-h-[450px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const isInitialStyleEffectRun = useRef(true);
  // Always-current waypoints ref so async style.load callbacks (which close
  // over stale props from when the effect was registered) can still draw the
  // live route without waiting for a React re-render cycle.
  const waypointsRef = useRef<MapWaypoint[]>(waypoints);
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

  const [activeTileType, setActiveTileType] = useState<TileStyleType>('satellite');
  const [isGlobe, setIsGlobe] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  // Bumped whenever MapLibre internally reloads its style (e.g. after
  // setProjection, setStyle) — forces the data-update effect to re-run
  // so route/waypoint GeoJSON is re-populated on the fresh sources.
  const [styleVersion, setStyleVersion] = useState<number>(0);

  const activeWaypoints: MapWaypoint[] = waypoints;

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

      // --- Persistent style.load listener ---
      // setProjection('globe'), setStyle(), and certain MapLibre internals
      // can trigger an async style reload that WIPES all custom sources
      // and layers we previously added. By listening to EVERY style.load
      // event, we guarantee our layers are always re-created, and we
      // bump a React state counter so the data-update effect re-runs
      // to repopulate GeoJSON on the fresh (empty) sources.
      map.on('style.load', () => {
        initMapLayers(map);
        // Immediately re-populate route data using the ref (always current)
        // so there is no frame where the route is missing after a style reload.
        // Without this, the sequence is: style.load wipes sources → initMapLayers
        // adds empty sources → styleVersion bumps → React schedules re-render →
        // NEXT frame runs data-update effect. During that gap the map is empty.
        // Using the ref lets us fill the sources synchronously here instead.
        const liveWps = waypointsRef.current;
        if (liveWps.length > 0) {
          updateRouteGeoJSON(map, liveWps);
          updateRiskZonesGeoJSON(map, true, liveWps);
        }
        setStyleVersion((v) => v + 1);
      });

      map.on('load', () => {
        // The persistent style.load listener above has already run by
        // this point (style.load fires before load), so layers exist.
        // We do NOT call setProjection here — the dedicated projection
        // effect handles it. Calling it here triggers an async style
        // reload that wipes sources before the update effect can
        // populate them.
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

        const riskScore = props.segment_risk_score != null ? Number(props.segment_risk_score) : null;
        const riskPct = riskScore != null ? (riskScore * 100).toFixed(1) : null;
        const riskColor = riskScore == null ? '#bbc9cf' : riskScore <= 0.2 ? '#39ff14' : riskScore <= 0.45 ? '#ffcc00' : '#ff3333';
        const riskLabel = riskScore == null ? 'N/A' : riskScore <= 0.2 ? 'LOW' : riskScore <= 0.45 ? 'MODERATE' : 'HIGH';

        const iceRisk = props.ice_risk != null ? (Number(props.ice_risk) * 100).toFixed(1) : null;
        const icebergRisk = props.iceberg_risk != null ? (Number(props.iceberg_risk) * 100).toFixed(1) : null;
        const weatherRisk = props.weather_risk != null ? (Number(props.weather_risk) * 100).toFixed(1) : null;

        const popupHtml = `
          <div style="
            background: rgba(7, 20, 32, 0.96);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 218, 243, 0.4);
            border-radius: 10px;
            padding: 14px 16px;
            color: #d7e4f5;
            font-family: 'Inter', sans-serif;
            min-width: 250px;
            max-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 10px;">
              <span style="font-weight: 800; font-size: 13px; color: #00daf3;">WAYPOINT #${String(props.sequence_no).padStart(3, '0')}</span>
              <span style="font-family: monospace; font-size: 10px; color: #839493; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;">${isStart ? 'ORIGIN' : isEnd ? 'DEST' : 'TRANSIT'}</span>
            </div>
            <div style="font-family: monospace; font-size: 11px; margin-bottom: 4px;">
              POSITION: <strong style="color: #fff;">${latToDegMin(coordinates[1])} ${lonToDegMin(coordinates[0])}</strong>
            </div>
            <div style="font-family: monospace; font-size: 10px; margin-bottom: 8px; color: #839493;">
              ${coordinates[1].toFixed(4)}\u00b0, ${coordinates[0].toFixed(4)}\u00b0
            </div>
            ${props.eta ? `<div style="font-size: 11px; margin-bottom: 4px; color: #b9cac9;">ETA: <strong style="color: #fff;">${props.eta}</strong></div>` : ''}
            ${props.cumulative_fuel_l !== undefined ? `<div style="font-size: 11px; margin-bottom: 8px; color: #b9cac9;">Cumulative Fuel: <strong style="color: #35d4ff;">${Number(props.cumulative_fuel_l).toLocaleString()} L</strong></div>` : ''}
            ${riskPct != null ? `
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 9px; font-weight: 700; color: #bbc9cf; text-transform: uppercase; letter-spacing: 0.5px;">Segment Risk</span>
                  <span style="font-family: monospace; font-weight: 700; font-size: 12px; color: ${riskColor};">${riskLabel} (${riskPct}%)</span>
                </div>
                <div style="width: 100%; background: #071420; height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                  <div style="width: ${Math.min(100, Math.max(5, Number(riskPct)))}%; height: 100%; background: ${riskColor}; border-radius: 3px; box-shadow: 0 0 6px ${riskColor};"></div>
                </div>
                ${(iceRisk || icebergRisk || weatherRisk) ? `
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; text-align: center;">
                    ${iceRisk != null ? `<div style="background: #101d29; padding: 4px; border-radius: 4px; border: 1px solid rgba(60,73,78,0.5);"><div style="font-size: 8px; font-weight: 700; color: #bbc9cf;">ICE</div><div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #00daf3;">${iceRisk}%</div></div>` : ''}
                    ${icebergRisk != null ? `<div style="background: #101d29; padding: 4px; border-radius: 4px; border: 1px solid rgba(60,73,78,0.5);"><div style="font-size: 8px; font-weight: 700; color: #bbc9cf;">BERG</div><div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #ffaa00;">${icebergRisk}%</div></div>` : ''}
                    ${weatherRisk != null ? `<div style="background: #101d29; padding: 4px; border-radius: 4px; border: 1px solid rgba(60,73,78,0.5);"><div style="font-size: 8px; font-weight: 700; color: #bbc9cf;">WX</div><div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #b3c6db;">${weatherRisk}%</div></div>` : ''}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;

        popupRef.current = new MapLibre.Popup({ closeButton: false, className: 'himdrishti-popup' })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);
      });

      // Iceberg Cluster & Point Click Handler
      const handleIcebergClick = (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const coordinates = (feature.geometry as any).coordinates.slice();

        if (popupRef.current) popupRef.current.remove();

        const count = props.point_count;
        const title = count ? `🧊 ICEBERG DRIFT CLUSTER (${count} DETECTED)` : `🧊 TRACKED ICEBERG ${props.iceberg_id || 'UNKNOWN'}`;
        const radiusText = props.confidence_radius_km != null ? `±${Number(props.confidence_radius_km).toFixed(1)} km` : 'N/A';
        const dayText = props.horizon_day != null ? `Day ${props.horizon_day}` : '';
        const popupHtml = `
          <div style="
            background: rgba(7, 20, 32, 0.96);
            backdrop-filter: blur(12px);
            border: 1px solid #ffaa00;
            border-radius: 10px;
            padding: 12px 14px;
            color: #d7e4f5;
            font-family: 'Inter', sans-serif;
            min-width: 220px;
            box-shadow: 0 8px 32px rgba(255, 170, 0, 0.3);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 170, 0, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-weight: 800; font-size: 12px; color: #ffaa00;">${title}</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 4px; color: #e2e8f0;">
              SOURCE: <strong style="color: #00daf3;">Model 2 Physics-Informed Drift Forecast</strong>${dayText ? ` (${dayText})` : ''}
            </div>
            <div style="font-size: 11px; margin-bottom: 4px; color: #e2e8f0;">
              POSITION CONFIDENCE RADIUS: <strong style="color: #ffc107;">${radiusText}</strong>
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              Proximity: Safe buffer distance maintained by Model 3 A* router.
            </div>
          </div>
        `;

        popupRef.current = new MapLibre.Popup({ closeButton: true, className: 'himdrishti-popup' })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);
      };

      map.on('click', MAP_LAYERS.ICEBERG_POINTS, handleIcebergClick);
      map.on('click', MAP_LAYERS.ICEBERG_CLUSTERS, handleIcebergClick);

      // Cursor pointer hover effects
      map.on('mouseenter', MAP_LAYERS.WAYPOINT_POINTS, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MAP_LAYERS.WAYPOINT_POINTS, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', MAP_LAYERS.ICEBERG_POINTS, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MAP_LAYERS.ICEBERG_POINTS, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', MAP_LAYERS.ICEBERG_CLUSTERS, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MAP_LAYERS.ICEBERG_CLUSTERS, () => { map.getCanvas().style.cursor = ''; });

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

    // This effect's dependency on `activeTileType` means it also fires once
    // on mount, when the map already has this exact style from its own
    // constructor call (see the map-creation effect above) and is still
    // loading it for the FIRST time. Calling map.setStyle() again here in
    // that moment made MapLibre abandon and "rebuild the style from
    // scratch" mid-load (visible as a real console warning in every test
    // run, local and deployed) — a race whose outcome depends on network
    // timing: the rebuild's own style.load handler below closes over
    // `activeWaypoints` from THIS render only and never re-fires after
    // that, so if it resolves after the real route data has already
    // arrived and been drawn by the "Update Sources" effect further down,
    // it silently re-clears the route right after drawing it — no error,
    // just an empty map, exactly what a fresh page load surfaced. Skip the
    // switch entirely on this first run; only a genuine later change to
    // activeTileType (the user clicking a different basemap button) should
    // ever call setStyle again.
    if (isInitialStyleEffectRun.current) {
      isInitialStyleEffectRun.current = false;
      return;
    }

    const map = mapRef.current;
    map.setStyle(BASEMAP_STYLES[activeTileType]);

    const handleStyleLoad = () => {
      initMapLayers(map);
      // Use ref for waypoints — this callback closes over props from when
      // activeTileType changed, but the user's route may have arrived after
      // that. waypointsRef.current is always the live value.
      const liveWps = waypointsRef.current;
      updateRouteGeoJSON(map, liveWps);
      updateRiskZonesGeoJSON(map, showRiskZones, liveWps);
      updateIcebergsGeoJSON(map, showIcebergs, liveWps);
      updateVesselGeoJSON(map, vesselLat, vesselLon, vesselHeading, vesselSpeed, vesselName);
      setLayerGroupVisibility(map, [MAP_LAYERS.BATHYMETRY], showBathymetry);
      updateSarQuicklookImage(map, showSarQuicklook, sarBbox, sarImageUrl);
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
  // `styleVersion` is bumped by the persistent style.load listener every
  // time MapLibre internally reloads its style (projection change, basemap
  // switch). That wipes our GeoJSON sources, so we MUST re-populate data.
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || mapError) return;
    const map = mapRef.current;

    // Defensive: if sources were wiped (e.g. async projection style reload
    // settled between renders), ensure they exist before trying to populate.
    if (!map.getSource('recommended-route')) {
      initMapLayers(map);
    }

    const startWp = activeWaypoints[0];
    const currentVesselLat = vesselLat ?? startWp?.lat ?? -60.0;
    const currentVesselLon = vesselLon ?? startWp?.lon ?? 40.0;

    updateRouteGeoJSON(map, activeWaypoints);
    updateRiskZonesGeoJSON(map, showRiskZones, activeWaypoints);
    updateVesselGeoJSON(map, currentVesselLat, currentVesselLon, vesselHeading, vesselSpeed, vesselName);
    updateAlertsGeoJSON(map, alerts);

    // Compute bounding box for model forecast queries
    let bbox = '-180,-90,180,90';
    if (activeWaypoints.length > 0) {
      const lats = activeWaypoints.map((w) => w.lat);
      const lons = activeWaypoints.map((w) => w.lon);
      const minLat = Math.min(...lats) - 2.0;
      const maxLat = Math.max(...lats) + 2.0;
      const minLon = Math.min(...lons) - 2.0;
      const maxLon = Math.max(...lons) + 2.0;
      bbox = `${minLon.toFixed(2)},${minLat.toFixed(2)},${maxLon.toFixed(2)},${maxLat.toFixed(2)}`;
    }

    // Fetch the real Model 1 sea-ice forecast & Model 2 iceberg forecast for
    // the currently selected horizon day, so the 7-day slider actually
    // changes what's shown instead of always displaying day 1.
    Promise.all([
      api.getSeaIceForecast(bbox, horizonDay, voyageId).catch(() => null),
      api.getIcebergForecast(bbox, horizonDay, voyageId).catch(() => null),
    ]).then(([seaIceGeoJSON, icebergGeoJSON]) => {
      if (mapRef.current) {
        updateSeaIceGeoJSON(mapRef.current, showSeaIce, seaIceGeoJSON);
        updateRiskZonesGeoJSON(mapRef.current, showRiskZones, activeWaypoints, seaIceGeoJSON);
        updateIcebergsGeoJSON(mapRef.current, showIcebergs, activeWaypoints, icebergGeoJSON);
      }
      onForecastLoaded?.(seaIceGeoJSON, icebergGeoJSON);
    });

    setLayerGroupVisibility(map, [MAP_LAYERS.SEA_ICE], showSeaIce);
    setLayerGroupVisibility(map, [MAP_LAYERS.RISK_ZONES_FILL, MAP_LAYERS.RISK_ZONES_OUTLINE], showRiskZones);
    setLayerGroupVisibility(
      map,
      [MAP_LAYERS.ICEBERG_CLUSTERS, MAP_LAYERS.ICEBERG_CLUSTER_COUNT, MAP_LAYERS.ICEBERG_POINTS],
      showIcebergs
    );
    setLayerGroupVisibility(
      map,
      [MAP_LAYERS.ICEBERG_ANCHOR_POINTS, MAP_LAYERS.ICEBERG_DRIFT_LINES, MAP_LAYERS.ICEBERG_DRIFT_ARROWS],
      showIcebergs && showIcebergDrift
    );
    setLayerGroupVisibility(map, [MAP_LAYERS.BATHYMETRY], showBathymetry);
    updateSarQuicklookImage(map, showSarQuicklook, sarBbox, sarImageUrl);

    // NOTE: No fitBounds here — we only auto-frame on INITIAL map load (inside
    // the 'load' event handler above). Re-framing every time a layer toggle,
    // risk-profile, or tab changes is jarring and disrupts the user's pan/zoom.
    // Use the "FIT ROUTE" button in MapControls for an explicit re-frame.
  }, [waypoints, showSeaIce, showIcebergs, showIcebergDrift, showRiskZones, showBathymetry, showSarQuicklook, sarBbox, sarImageUrl, vesselLat, vesselLon, vesselHeading, vesselSpeed, vesselName, horizonDay, voyageId, mapLoaded, mapError, styleVersion]);

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
          <svg className="absolute inset-0 w-full h-full opacity-10" pointerEvents="none">
            <defs>
              <radialGradient id="polarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#003a4d" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#040c14" stopOpacity="0.95" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#polarGlow)" />
            <circle cx="50%" cy="50%" r="20%" stroke="#1a4a5a" strokeWidth="1" strokeDasharray="4,4" fill="none" />
            <circle cx="50%" cy="50%" r="35%" stroke="#1a4a5a" strokeWidth="1" strokeDasharray="6,6" fill="none" />
            <circle cx="50%" cy="50%" r="48%" stroke="#1a4a5a" strokeWidth="1.5" fill="none" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#1a4a5a" strokeWidth="0.8" strokeDasharray="4,4" />
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#1a4a5a" strokeWidth="0.8" strokeDasharray="4,4" />
          </svg>

          {/* Fallback Tactical Route Projection — real waypoints only. Sea-ice,
              iceberg and risk-zone overlays need the WebGL map view since this
              simplified chart has no real geographic projection to place them on. */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            {(showRiskZones || showIcebergs) && (
              <text x="500" y="40" textAnchor="middle" fill="#bbc9cf" fontSize="11" fontFamily="monospace">
                Hazard overlays unavailable in fallback chart mode — enable WebGL for live sea-ice/iceberg layers
              </text>
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
                {vesselName} ({vesselSpeed} KTS)
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
        showBathymetry={showBathymetry}
        onToggleBathymetry={onToggleBathymetry}
        showSarQuicklook={showSarQuicklook}
        onToggleSarQuicklook={onToggleSarQuicklook}
      />

      {/* Map Legend Panel */}
      <MapLegend
        showSeaIce={showSeaIce}
        showIcebergs={showIcebergs}
        showIcebergDrift={showIcebergDrift}
        showBathymetry={showBathymetry}
        showRiskZones={showRiskZones}
        showSarQuicklook={showSarQuicklook && !!sarImageUrl}
      />
    </div>
  );
};
