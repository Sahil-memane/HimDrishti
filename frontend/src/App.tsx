import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { VoyageSetupPage } from './pages/VoyageSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForecastPage } from './pages/ForecastPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { useAuthStore, useVoyageStore } from './store/useStore';

/** Requires a logged-in operator; otherwise sends them to /login. */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/**
 * Requires a real, already-planned voyage before showing route-dependent
 * pages. Without this, /dashboard, /forecast, /alerts and /analytics could
 * previously be opened directly and would show a fabricated placeholder
 * route instead of real backend data.
 */
const RequireVoyage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeVoyageId, routeData, voyageStatus } = useVoyageStore();
  if (!activeVoyageId || (!routeData && voyageStatus !== 'processing')) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page with live 3D Polar Ocean canvas & toggle switcher */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Gateway */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Routes inside Shared Layout */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/setup" element={<VoyageSetupPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireVoyage>
                <DashboardPage />
              </RequireVoyage>
            }
          />
          <Route
            path="/forecast"
            element={
              <RequireVoyage>
                <ForecastPage />
              </RequireVoyage>
            }
          />
          <Route
            path="/alerts"
            element={
              <RequireVoyage>
                <AlertsPage />
              </RequireVoyage>
            }
          />
          <Route
            path="/analytics"
            element={
              <RequireVoyage>
                <AnalyticsPage />
              </RequireVoyage>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
