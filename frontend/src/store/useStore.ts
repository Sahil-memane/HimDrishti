import { create } from 'zustand';
import {
  type RouteResponse,
  type AlertItem,
  generateDynamicModelRoute,
  buildModel3Recommendation,
  type Model3Recommendation,
} from '../services/api';

interface UserState {
  userId: string | null;
  email: string | null;
  role: string | null;
  token: string | null;
  setUser: (user: { userId: string; email: string; role: string; token: string }) => void;
  logout: () => void;
}

interface VoyageState {
  activeVoyageId: string | null;
  voyageStatus: string;
  routeData: RouteResponse;
  llmRecommendation: Model3Recommendation | string;
  setActiveVoyage: (id: string, status?: string) => void;
  setRouteData: (data: RouteResponse) => void;
  setLlmRecommendation: (rec: Model3Recommendation | string) => void;
}

interface ForecastState {
  horizonDay: number;
  setHorizonDay: (day: number) => void;
}

interface AlertState {
  alerts: AlertItem[];
  setAlerts: (alerts: AlertItem[]) => void;
  acknowledgeAlert: (alertId: string) => void;
}

// Initial active voyage route calculation
const initialInputs = {
  vessel_id: 'b0000000-0000-0000-0000-000000000001',
  start_lat: -60.0,
  start_lon: 40.0,
  dest_lat: -77.846,
  dest_lon: 166.6682,
  departure_time: new Date().toISOString(),
  speed_knots: 12.5,
  fuel_consumption_lph: 850,
  risk_tolerance: 'balanced' as const,
};

const initialRoute = generateDynamicModelRoute(initialInputs);
const initialRec = buildModel3Recommendation('balanced', initialRoute);

export const useAuthStore = create<UserState>((set) => ({
  userId: localStorage.getItem('himdrishti_user_id'),
  email: localStorage.getItem('himdrishti_email'),
  role: localStorage.getItem('himdrishti_role'),
  token: localStorage.getItem('himdrishti_token'),

  setUser: (user) => {
    localStorage.setItem('himdrishti_user_id', user.userId);
    localStorage.setItem('himdrishti_email', user.email);
    localStorage.setItem('himdrishti_role', user.role);
    localStorage.setItem('himdrishti_token', user.token);
    set({ userId: user.userId, email: user.email, role: user.role, token: user.token });
  },

  logout: () => {
    localStorage.removeItem('himdrishti_user_id');
    localStorage.removeItem('himdrishti_email');
    localStorage.removeItem('himdrishti_role');
    localStorage.removeItem('himdrishti_token');
    set({ userId: null, email: null, role: null, token: null });
  },
}));

export const useVoyageStore = create<VoyageState>((set) => ({
  activeVoyageId: 'b0000000-0000-0000-0000-000000000001',
  voyageStatus: 'planned',
  routeData: initialRoute,
  llmRecommendation: initialRec,

  setActiveVoyage: (id, status = 'planned') => set({ activeVoyageId: id, voyageStatus: status }),
  setRouteData: (data) => set({ routeData: data }),
  setLlmRecommendation: (rec) => set({ llmRecommendation: rec }),
}));

export const useForecastStore = create<ForecastState>((set) => ({
  horizonDay: 1,
  setHorizonDay: (day) => set({ horizonDay: day }),
}));

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [
    {
      alert_id: 'a1',
      voyage_id: 'b0000000-0000-0000-0000-000000000001',
      alert_type: 'iceberg_proximity',
      severity: 'high',
      message: 'Hull Integrity Breach Risk — SECTOR: BOW_PORT_32 | PRESSURE: 1.4x NORM',
      triggered_at: new Date().toISOString(),
      acknowledged: false,
    },
    {
      alert_id: 'a2',
      voyage_id: 'b0000000-0000-0000-0000-000000000001',
      alert_type: 'high_ice_risk',
      severity: 'medium',
      message: 'Thermal Deviation Detected — NODE: ENG_COOL_04 | TEMP: +4.2°C',
      triggered_at: new Date().toISOString(),
      acknowledged: false,
    },
  ],

  setAlerts: (alerts) => set({ alerts }),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.alert_id === alertId ? { ...a, acknowledged: true } : a)),
    })),
}));
