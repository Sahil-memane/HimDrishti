import { create } from 'zustand';
import { type RouteResponse, type AlertItem, type Model3Recommendation } from '../services/api';

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
  routeData: RouteResponse | null;
  llmRecommendation: Model3Recommendation | string | null;
  setActiveVoyage: (id: string, status?: string) => void;
  setRouteData: (data: RouteResponse) => void;
  setLlmRecommendation: (rec: Model3Recommendation | string) => void;
  clearVoyage: () => void;
}

interface ForecastState {
  horizonDay: number;
  setHorizonDay: (day: number) => void;
}

interface AlertState {
  alerts: AlertItem[];
  setAlerts: (alerts: AlertItem[]) => void;
  fetchAlerts: (voyageId?: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
}

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
    localStorage.removeItem('himdrishti_active_voyage_id');
    set({ userId: null, email: null, role: null, token: null });
    useVoyageStore.getState().clearVoyage();
  },
}));

// No fake pre-seeded route: a fresh session has no active voyage until the
// user actually plans one, or a previously planned voyage id is restored
// from localStorage (so a page refresh doesn't lose an in-progress voyage).
export const useVoyageStore = create<VoyageState>((set) => ({
  activeVoyageId: localStorage.getItem('himdrishti_active_voyage_id'),
  voyageStatus: 'idle',
  routeData: null,
  llmRecommendation: null,

  setActiveVoyage: (id, status = 'planned') => {
    localStorage.setItem('himdrishti_active_voyage_id', id);
    set({ activeVoyageId: id, voyageStatus: status });
  },
  setRouteData: (data) => set({ routeData: data }),
  setLlmRecommendation: (rec) => set({ llmRecommendation: rec }),
  clearVoyage: () => {
    localStorage.removeItem('himdrishti_active_voyage_id');
    set({ activeVoyageId: null, voyageStatus: 'idle', routeData: null, llmRecommendation: null });
  },
}));

export const useForecastStore = create<ForecastState>((set) => ({
  horizonDay: 1,
  setHorizonDay: (day) => set({ horizonDay: day }),
}));

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],

  setAlerts: (alerts) => set({ alerts }),

  fetchAlerts: async (voyageId?: string) => {
    if (!voyageId) {
      set({ alerts: [] });
      return;
    }
    try {
      const { api } = await import('../services/api');
      const data = await api.getAlerts(voyageId);
      set({ alerts: data });
    } catch {
      // Fallback empty if unauthenticated or network error
      set({ alerts: [] });
    }
  },

  acknowledgeAlert: async (alertId: string) => {
    try {
      const { api } = await import('../services/api');
      await api.acknowledgeAlert(alertId);
    } catch {
      // Ignore network error and proceed to local state update
    }
    set((state) => ({
      alerts: state.alerts.map((a) => (a.alert_id === alertId ? { ...a, acknowledged: true, status: 'ACKNOWLEDGED' } : a)),
    }));
  },
}));
