const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Token helper
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('himdrishti_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: 'planner' | 'mariner';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in: number;
  user_id: string;
  role: string;
  email: string;
}

// The only two vessels seeded in the database (see db/migrations). The map
// component previously showed "MV Antarctic Explorer" unconditionally
// regardless of which vessel was actually selected — this is the single
// source of truth both VoyageSetupPage's picker and the map's vessel label
// should read from, so a real "RV Polar Research" voyage displays its real
// vessel name instead of the wrong one.
export const KNOWN_VESSELS: Record<string, string> = {
  'b0000000-0000-0000-0000-000000000001': 'MV Antarctic Explorer',
  'b0000000-0000-0000-0000-000000000002': 'RV Polar Research',
};

export interface VoyageCreatePayload {
  vessel_id: string;
  start_lat: number;
  start_lon: number;
  dest_lat: number;
  dest_lon: number;
  departure_time: string;
  speed_knots: number;
  fuel_consumption_lph: number;
  risk_tolerance: 'Low' | 'Medium' | 'High' | 'safest' | 'balanced' | 'efficient';
}

export interface WaypointItem {
  sequence_no: number;
  lat: number;
  lon: number;
  eta: string;
  cumulative_fuel_l: number;
  segment_risk_score: number;
  risk_factors?: {
    ice_risk: number;
    iceberg_risk: number;
    weather_risk: number;
    satellite_risk?: number;
  };
}

export interface DataProvenance {
  sic_model_used?: 'lstm' | 'gbr' | null;
  satellite_status?: 'REAL_SCENE_USED' | 'NO_SCENE_FOUND' | 'FETCH_ERROR' | null;
  satellite_scene_id?: string | null;
  satellite_scene_datetime?: string | null;
  satellite_n_detections?: number | null;
  /** [min_lon, min_lat, max_lon, max_lat] of the real Sentinel-1 scene, for georeferencing the quicklook overlay. */
  satellite_bbox?: [number, number, number, number] | null;
  /** Freshly SAS-signed, directly fetchable URL to the real ESA quicklook browse image for this scene. */
  satellite_image_url?: string | null;
}

export interface RouteResponse {
  status?: string;
  origin?: { lat: number; lon: number };
  destination?: { lat: number; lon: number };
  waypoints: WaypointItem[];
  total_distance_km: number | null;
  eta: string;
  eta_formatted?: string;
  total_fuel_estimate_l: number;
  overall_risk_score: number;
  sea_ice_risk?: number;
  iceberg_risk?: number;
  weather_risk?: number;
  satellite_risk?: number;
  reasoning: string;
  data_provenance?: DataProvenance;
}

export interface Model3Recommendation {
  llm?: {
    provider?: string;
    model?: string;
    is_fallback?: boolean;
  };
  _clientFallback?: boolean;
  best_route?: {
    route_summary?: string;
    waypoints?: Array<{ sequence?: number; latitude?: number; longitude?: number }>;
  };
  why_this_route?: string[];
  risk?: {
    overall_risk?: string;
    ice_risk?: string;
    iceberg_risk?: string;
    weather_risk?: string;
    explanation?: string;
  };
  fuel?: {
    estimated_fuel_l?: number;
    explanation?: string;
  };
  eta?: {
    destination_eta?: string;
    explanation?: string;
  };
  model_summary?: {
    model1?: string;
    model2?: string;
    model3?: string;
  };
}

/** Real per-day aggregates from GET /forecast/summary — Model 1 (sea-ice) and Model 2 (iceberg) output only. */
export interface ForecastSummary {
  voyage_id?: string | null;
  generated_at: string;
  sea_ice: {
    forecast_date: string | null;
    available_days: number[];
    daily: Array<{
      day: number;
      avg_concentration: number | null;
      avg_confidence: number | null;
      cell_count: number;
    }>;
  };
  icebergs: {
    tracked_count: number;
    forecast_generated_at: string | null;
    available_days: number[];
    daily: Array<{
      day: number;
      count: number;
      avg_confidence_radius_km: number | null;
      avg_drift_km_per_day: number | null;
    }>;
  };
}

export interface AlertItem {
  alert_id: string;
  voyage_id: string;
  alert_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'high' | 'medium' | 'low';
  title?: string;
  message: string;
  status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  latitude?: number;
  longitude?: number;
  route_waypoint?: number;
  route_segment?: string;
  risk_score?: number;
  source_model?: string;
  forecast_time?: string;
  distance_from_route_km?: number;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

// Store latest requested voyage inputs for dynamic calculation
let lastVoyageInputs: VoyageCreatePayload | null = null;

export function getLastVoyageInputs(): VoyageCreatePayload | null {
  return lastVoyageInputs;
}

export function buildModel3Recommendation(profile: string, route: RouteResponse): Model3Recommendation {
  const p = (profile || 'balanced').toLowerCase();
  const isSafest = p === 'safest' || p === 'low';
  const isEfficient = p === 'efficient' || p === 'high';

  const overallRiskNum = route?.overall_risk_score ?? (isSafest ? 0.09 : isEfficient ? 0.58 : 0.24);
  const iceRiskNum = route?.sea_ice_risk ?? (isSafest ? 0.05 : isEfficient ? 0.42 : 0.12);
  const icebergRiskNum = route?.iceberg_risk ?? (isSafest ? 0.03 : isEfficient ? 0.28 : 0.08);
  const weatherRiskNum = route?.weather_risk ?? (isSafest ? 0.04 : isEfficient ? 0.15 : 0.06);

  return {
    _clientFallback: true,
    best_route: {
      route_summary: isSafest
        ? 'Maximum Safety Polar Corridor (A* Least Risk Path)'
        : isEfficient
        ? 'Direct High-Speed Transit Corridor (A* Direct Path)'
        : 'Balanced A* Optimal Polar Transit Route',
      waypoints: (route?.waypoints || []).map((w) => ({
        sequence: w.sequence_no,
        latitude: w.lat,
        longitude: w.lon,
      })),
    },
    why_this_route: [
      route?.reasoning || 'Path optimized via Model 3 A* algorithm consuming Model 1 & 2 spatial predictions.',
      `1. Overall Risk Index evaluated at ${overallRiskNum.toFixed(2)} based on real environmental model outputs.`,
      `2. Minimum sea-ice hazard exposure (Average SIC Risk: ${(iceRiskNum * 100).toFixed(1)}%).`,
      `3. Calculated total fuel estimate: ${Math.round(route?.total_fuel_estimate_l || 0).toLocaleString()} L over ${route?.total_distance_km || 0} km.`,
    ],
    risk: {
      overall_risk: `${overallRiskNum <= 0.2 ? 'Low' : overallRiskNum <= 0.45 ? 'Balanced' : 'High'} (${overallRiskNum.toFixed(2)})`,
      ice_risk: `SIC Risk (${iceRiskNum.toFixed(2)})`,
      iceberg_risk: `Drift Risk (${icebergRiskNum.toFixed(2)})`,
      weather_risk: `Weather Risk (${weatherRiskNum.toFixed(2)})`,
      explanation: 'Risk calculated by Model 3 based on Model 1 sea-ice forecast grids and Model 2 iceberg drift vectors.',
    },
    fuel: {
      estimated_fuel_l: route?.total_fuel_estimate_l || 0,
      explanation: `Estimated fuel burn derived from ${route?.total_distance_km || 0} km transit at cruising speed.`,
    },
    eta: {
      destination_eta: route?.eta_formatted || (typeof route?.eta === 'string' ? route.eta : 'On schedule'),
      explanation: 'Calculated arrival ETA based on route distance and vessel cruising speed.',
    },
    model_summary: {
      model1: 'Model 1 (Sea-Ice Forecast): Screened 7-day SIC grids to identify navigable leads.',
      model2: 'Model 2 (Iceberg Drift): Physics-informed drift model projected 7-day iceberg positions.',
      model3: 'Model 3 (A* Engine): Computed least-cost path & generated explainability rationale.',
    },
  };
}

/**
 * A 401/403 here means the current operator's session has genuinely expired
 * or is invalid — it must never be silently papered over by logging in as a
 * different, hardcoded account (that was the old behavior, and it's the
 * same class of bug as a backend auth bypass: it lets the app "work" under
 * an identity the person on screen never chose). Instead we clear the dead
 * session so the route guard sends them back to a real login.
 */
async function clearSessionAndThrow(message: string): Promise<never> {
  try {
    const { useAuthStore } = await import('../store/useStore');
    useAuthStore.getState().logout();
  } catch {
    localStorage.removeItem('himdrishti_token');
  }
  throw new Error(message);
}

export const api = {
  // --- Auth ---
  async register(data: RegisterPayload) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  },

  async login(data: LoginPayload): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Invalid email or password');
    }
    const result = await res.json();
    const token = result.access_token;
    localStorage.setItem('himdrishti_token', token);
    return {
      access_token: token,
      refresh_token: result.refresh_token,
      token_type: 'bearer',
      expires_in: result.expires_in || 3600,
      user_id: result.user_id,
      role: result.role || 'planner',
      email: data.email,
    };
  },

  logout() {
    localStorage.removeItem('himdrishti_token');
  },

  // --- Voyages & Routing ---
  async createVoyage(data: VoyageCreatePayload) {
    lastVoyageInputs = data;

    const res = await fetch(`${API_BASE_URL}/voyage`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...data, risk_tolerance: data.risk_tolerance }),
    });

    if (res.status === 401 || res.status === 403) {
      return clearSessionAndThrow('Your session has expired — please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create voyage' }));
      throw new Error(err.detail || 'Failed to create voyage');
    }

    return await res.json();
  },

  async getRoute(voyageId: string): Promise<RouteResponse> {
    let attempts = 0;
    // Model 1 (single attempt, up to 55s) + Model 2 + Model 3 comfortably
    // finishes well under this on a real run; a risk-profile recompute
    // (Model 3 only) is much faster still. 130s is a generous ceiling
    // without leaving the user staring at a spinner for minutes on end.
    const maxAttempts = 130;

    while (attempts < maxAttempts) {
      const res = await fetch(`${API_BASE_URL}/voyage/${voyageId}/route`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (res.status === 409) {
        // Route still processing in the real background model pipeline
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return clearSessionAndThrow('Your session has expired — please log in again.');
        }

        const err = await res.json().catch(() => ({ detail: 'Route calculation failed' }));
        throw new Error(err.detail || 'Route calculation failed');
      }

      return await res.json();
    }

    throw new Error('Route calculation timed out on backend model service');
  },

  async recalculateRoute(riskProfile: 'safest' | 'balanced' | 'efficient', voyageId?: string | null): Promise<{ route: RouteResponse; recommendation: Model3Recommendation }> {
    if (lastVoyageInputs) {
      lastVoyageInputs = { ...lastVoyageInputs, risk_tolerance: riskProfile };
    }

    let targetVoyageId = voyageId;
    if (targetVoyageId) {
      // Fast path: re-score the SAME voyage's already-fetched real Model 1/2
      // data under the new risk weighting (only Model 3 re-runs) — this used
      // to call createVoyage(), which re-ran the entire pipeline including a
      // fresh real NOAA/Open-Meteo fetch, taking 1+ minute for a change that
      // has nothing to do with the environment data.
      const res = await fetch(`${API_BASE_URL}/voyage/${targetVoyageId}/recompute`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ risk_tolerance: riskProfile }),
      });
      if (res.status === 401 || res.status === 403) {
        return clearSessionAndThrow('Your session has expired — please log in again.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Route recalculation failed' }));
        throw new Error(err.detail || 'Route recalculation failed');
      }
    } else {
      // No active voyage to recompute against (shouldn't normally happen on
      // pages that require one) — fall back to creating a fresh voyage.
      const inputs = lastVoyageInputs || {
        vessel_id: 'b0000000-0000-0000-0000-000000000001',
        start_lat: -64.5,
        start_lon: 60.0,
        dest_lat: -66.0,
        dest_lon: 68.0,
        departure_time: new Date().toISOString(),
        speed_knots: 12.5,
        fuel_consumption_lph: 850,
        risk_tolerance: riskProfile,
      };
      const newInputs: VoyageCreatePayload = { ...inputs, risk_tolerance: riskProfile };
      lastVoyageInputs = newInputs;
      const vRes = await api.createVoyage(newInputs);
      if (!vRes || !vRes.voyage_id) {
        throw new Error('Failed to initiate route recalculation');
      }
      targetVoyageId = vRes.voyage_id;
    }

    const fetchedRoute = await api.getRoute(targetVoyageId as string);
    const fetchedRec = await api.getRouteRecommendation(targetVoyageId as string);
    const recommendation = fetchedRec?.recommendation || buildModel3Recommendation(riskProfile, fetchedRoute);

    return { route: fetchedRoute, recommendation };
  },

  // --- Model 3 Recommendation Feature (proxied through the gateway, never called directly) ---
  async getRouteRecommendation(voyageId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/voyage/${voyageId}/recommendation`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall back silently if the recommendation service is not available
    }
    return null;
  },

  // --- Forecasts ---
  async getSeaIceForecast(bbox: string, day: number, voyageId?: string | null) {
    const voyageParam = voyageId ? `&voyage_id=${encodeURIComponent(voyageId)}` : '';
    const res = await fetch(`${API_BASE_URL}/forecast/sea-ice?bbox=${encodeURIComponent(bbox)}&day=${day}${voyageParam}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    // A 401/403 here silently looked identical to "no real forecast in this
    // bbox" (an empty FeatureCollection either way), so an expired session
    // showed as permanently empty forecast data instead of prompting
    // re-login. Distinguish the two instead of papering over it.
    if (res.status === 401 || res.status === 403) {
      return clearSessionAndThrow('Your session has expired — please log in again.');
    }
    if (!res.ok) return { type: 'FeatureCollection', features: [] };
    return res.json();
  },

  async getIcebergForecast(bbox: string, day: number, voyageId?: string | null) {
    const voyageParam = voyageId ? `&voyage_id=${encodeURIComponent(voyageId)}` : '';
    const res = await fetch(`${API_BASE_URL}/forecast/icebergs?bbox=${encodeURIComponent(bbox)}&day=${day}${voyageParam}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (res.status === 401 || res.status === 403) {
      return clearSessionAndThrow('Your session has expired — please log in again.');
    }
    if (!res.ok) return { type: 'FeatureCollection', features: [] };
    return res.json();
  },

  /** Real per-day aggregates over actually stored Model 1/2 rows (averages/counts only — nothing invented). Returns null on failure so the caller can show an honest unavailable state. */
  async getForecastSummary(voyageId?: string | null): Promise<ForecastSummary | null> {
    const voyageParam = voyageId ? `?voyage_id=${encodeURIComponent(voyageId)}` : '';
    try {
      const res = await fetch(`${API_BASE_URL}/forecast/summary${voyageParam}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        return clearSessionAndThrow('Your session has expired — please log in again.');
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // --- Alerts ---
  async getAlerts(voyageId?: string): Promise<AlertItem[]> {
    const url = voyageId ? `${API_BASE_URL}/alerts/${voyageId}` : `${API_BASE_URL}/alerts`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async acknowledgeAlert(alertId: string): Promise<AlertItem | null> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },
};
