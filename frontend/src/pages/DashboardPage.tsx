import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoyageStore } from '../store/useStore';
import { api, buildModel3Recommendation, getLastVoyageInputs, type Model3Recommendation } from '../services/api';
import { InteractivePolarMap } from '../components/map/InteractivePolarMap';
import type { MapWaypoint } from '../components/map/InteractivePolarMap';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeData, llmRecommendation, setRouteData, setLlmRecommendation } = useVoyageStore();

  const inputs = getLastVoyageInputs();
  const initialProfRaw = (inputs?.risk_tolerance || 'balanced').toLowerCase();
  const initialProfile = initialProfRaw === 'low' ? 'safest' : initialProfRaw === 'high' ? 'efficient' : (initialProfRaw as 'safest' | 'balanced' | 'efficient');

  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<'safest' | 'balanced' | 'efficient'>(initialProfile);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'WHY' | 'RISK' | 'FUEL_ETA' | 'MODELS'>('WHY');
  const [selectedWp, setSelectedWp] = useState<MapWaypoint | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (inputs?.risk_tolerance) {
      const p = (inputs.risk_tolerance).toLowerCase();
      setSelectedProfile(p === 'low' ? 'safest' : p === 'high' ? 'efficient' : (p as any));
    }
  }, [inputs?.risk_tolerance]);

  // Waypoints directly from store routeData
  const waypoints: MapWaypoint[] = routeData?.waypoints || [];

  // Parse structured Model 3 recommendation object or fallback
  const recObj: Model3Recommendation =
    typeof llmRecommendation === 'object' && llmRecommendation !== null
      ? (llmRecommendation as Model3Recommendation)
      : buildModel3Recommendation(selectedProfile, routeData);

  const overallRisk = routeData?.overall_risk_score ?? (selectedProfile === 'safest' ? 0.09 : selectedProfile === 'efficient' ? 0.58 : 0.24);
  const totalFuel = routeData?.total_fuel_estimate_l ?? (selectedProfile === 'safest' ? 96200 : selectedProfile === 'efficient' ? 68100 : 84500);
  const etaText = routeData?.eta || (selectedProfile === 'safest' ? '5d 04h' : selectedProfile === 'efficient' ? '3d 18h' : '4d 12h');

  // Recalculate route when optimization profile changes
  const handleProfileSelect = async (prof: 'safest' | 'balanced' | 'efficient') => {
    if (prof === selectedProfile && !recalculating) return;
    setSelectedProfile(prof);
    setRecalculating(true);
    try {
      const res = await api.recalculateRoute(prof);
      setRouteData(res.route);
      setLlmRecommendation(res.recommendation as any);
    } catch (err) {
      console.warn('Failed to recalculate route profile:', err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420]">
      {/* Interactive GIS Satellite Map Layer */}
      <InteractivePolarMap
        waypoints={waypoints}
        vesselLat={waypoints[0]?.lat}
        vesselLon={waypoints[0]?.lon}
        showSeaIce={showSic}
        showIcebergs={showIcebergs}
        showRiskZones={showRiskZones}
        onToggleSeaIce={(show) => setShowSic(show)}
        onToggleIcebergs={(show) => setShowIcebergs(show)}
        onToggleRiskZones={(show) => setShowRiskZones(show)}
        activeRiskProfile={selectedProfile}
        onWaypointSelect={(wp) => setSelectedWp(wp)}
        className="absolute inset-0 w-full h-full"
      />

      {/* Floating Overlay Panels */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
        {/* Top Row Right: Telemetry Stats */}
        <div className="flex justify-end items-start pointer-events-auto">
          <div className="glass-panel rounded-xl px-3.5 py-2 border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md shadow-xl flex items-center gap-4">
            <div className="flex items-center gap-1.5 border-r border-[#3c494e]/40 pr-3">
              <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
              <span className="font-bold text-[10px] text-[#bbc9cf] uppercase tracking-wider">
                Vessel Telemetry
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold text-white">
              <div>
                14.2 <span className="text-[10px] text-[#bbc9cf]">KTS</span>
              </div>
              <div className="text-[#3c494e]">|</div>
              <div>
                045° <span className="text-[10px] text-[#bbc9cf]">HDG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Waypoint Modal / Quick Readout */}
        {selectedWp && (
          <div className="pointer-events-auto self-center glass-panel p-4 rounded-xl border border-[#00daf3]/50 bg-[#071420]/95 backdrop-blur-lg shadow-2xl flex items-center gap-6 max-w-lg animate-fadeIn">
            <div>
              <div className="font-mono font-bold text-sm text-[#00daf3]">
                WAYPOINT #{String(selectedWp.sequence_no).padStart(3, '0')} INSPECTED
              </div>
              <div className="font-mono text-xs text-white">
                LAT/LON: {selectedWp.lat.toFixed(4)}, {selectedWp.lon.toFixed(4)}
              </div>
              {selectedWp.eta && <div className="text-xs text-[#bbc9cf]">ETA: {selectedWp.eta}</div>}
            </div>
            <button
              onClick={() => setSelectedWp(null)}
              className="text-[#bbc9cf] hover:text-white text-xs uppercase font-mono border border-white/20 px-2 py-1 rounded cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        )}

        {/* Bottom Row Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4 pointer-events-auto w-full">
          {/* Active Route Metrics */}
          <div className="glass-panel rounded-xl p-4 md:p-5 w-full lg:w-80 shadow-2xl flex flex-col gap-3 border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-2">
              <h2 className="font-bold text-base text-[#00daf3]">Active Route</h2>
              <span className="px-2 py-0.5 rounded bg-[#00daf3]/10 border border-[#00daf3]/30 text-[#00daf3] font-bold text-[10px] tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00daf3] animate-pulse" />
                {recalculating ? 'RECALCULATING...' : 'TRACKING'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase block">
                  ETA TARGET
                </span>
                <span className="font-mono text-white text-base font-bold truncate block">{etaText}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase block">
                  EST. FUEL
                </span>
                <span className="font-mono text-white text-base font-bold">
                  {Math.round(totalFuel).toLocaleString()} <span className="text-xs text-[#bbc9cf]">L</span>
                </span>
              </div>
            </div>

            {/* Overall Risk Index */}
            <div className="bg-[#101d29] p-2.5 rounded-lg border border-[#3c494e]/50 flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase">
                  OVERALL RISK INDEX
                </span>
                <span
                  className={`font-mono font-bold ${
                    overallRisk <= 0.2 ? 'text-[#39ff14]' : overallRisk <= 0.45 ? 'text-[#00daf3]' : 'text-[#ffb4ab]'
                  }`}
                >
                  {overallRisk <= 0.2 ? 'LOW' : overallRisk <= 0.45 ? 'BALANCED' : 'HIGH'} ({overallRisk.toFixed(2)})
                </span>
              </div>
              <div className="w-full bg-[#071420] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallRisk <= 0.2
                      ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]'
                      : overallRisk <= 0.45
                      ? 'bg-[#00daf3] shadow-[0_0_8px_#00daf3]'
                      : 'bg-[#ff3333] shadow-[0_0_8px_#ff3333]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, overallRisk * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Model 3 Comprehensive AI Rationale & Optimization Card (With Minimize Button) */}
          <div className="glass-panel rounded-xl p-4 md:p-5 w-full lg:w-[480px] shadow-2xl flex flex-col gap-3 border border-[#00daf3]/40 bg-[#071420]/95 backdrop-blur-xl transition-all duration-300">
            <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-[#bbc9cf] uppercase tracking-wider">
                  Optimization Parameter
                </h3>
                {recalculating && (
                  <span className="text-[10px] font-mono text-[#00daf3] animate-pulse">
                    ⚡ Recalculating A*...
                  </span>
                )}
              </div>

              {/* Minimize / Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-[#00daf3] hover:text-white text-xs font-mono font-bold border border-[#00daf3]/40 px-2 py-0.5 rounded bg-[#00daf3]/10 hover:bg-[#00daf3]/20 transition-all cursor-pointer flex items-center gap-1"
                title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
              >
                <span>{isMinimized ? 'EXPAND' : 'MINIMIZE'}</span>
                <span>{isMinimized ? '▲' : '▼'}</span>
              </button>
            </div>

            {!isMinimized && (
              <>
                {/* Profile Selector Buttons */}
                <div className="flex bg-[#1d2b3d] p-1 rounded-lg border border-[#3c494e]">
                  {(['safest', 'balanced', 'efficient'] as const).map((prof) => (
                    <button
                      key={prof}
                      type="button"
                      disabled={recalculating}
                      onClick={() => handleProfileSelect(prof)}
                      className={`flex-1 py-1.5 font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer ${
                        selectedProfile === prof
                          ? 'bg-[#00daf3] text-[#002020] shadow-[0_0_12px_rgba(0,218,243,0.5)]'
                          : 'text-[#bbc9cf] hover:text-white hover:bg-[#101d29]'
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>

                {/* Model 3 Structured Output Section */}
                <div className="bg-[#0b1724] rounded-lg border border-[#3c494e]/60 p-3 flex flex-col gap-2">
                  {/* Header with Nav Tabs */}
                  <div className="flex items-center justify-between border-b border-[#3c494e]/40 pb-2">
                    <div className="flex items-center gap-1.5 text-[#00daf3]">
                      <span className="material-symbols-outlined text-[18px]">psychology</span>
                      <span className="font-bold text-[10px] uppercase tracking-wider">
                        MODEL 3 EXPLAINABILITY
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('WHY')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                          activeTab === 'WHY' ? 'bg-[#00daf3]/20 text-[#00daf3] border border-[#00daf3]/40' : 'text-[#bbc9cf] hover:text-white'
                        }`}
                      >
                        WHY ROUTE
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('RISK')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                          activeTab === 'RISK' ? 'bg-[#00daf3]/20 text-[#00daf3] border border-[#00daf3]/40' : 'text-[#bbc9cf] hover:text-white'
                        }`}
                      >
                        RISK
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('FUEL_ETA')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                          activeTab === 'FUEL_ETA' ? 'bg-[#00daf3]/20 text-[#00daf3] border border-[#00daf3]/40' : 'text-[#bbc9cf] hover:text-white'
                        }`}
                      >
                        FUEL & ETA
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('MODELS')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                          activeTab === 'MODELS' ? 'bg-[#00daf3]/20 text-[#00daf3] border border-[#00daf3]/40' : 'text-[#bbc9cf] hover:text-white'
                        }`}
                      >
                        ENSEMBLE
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: WHY THIS ROUTE */}
                  {activeTab === 'WHY' && (
                    <div className="space-y-1.5 text-xs text-[#d7e4f5] font-sans min-h-[90px]">
                      <div className="font-bold text-[11px] text-[#00daf3] mb-1">
                        {recObj.best_route?.route_summary || 'Optimal A* Polar Navigation Path'}
                      </div>
                      {recObj.why_this_route && recObj.why_this_route.length > 0 ? (
                        recObj.why_this_route.map((reason, idx) => (
                          <p key={idx} className="text-[11px] leading-snug text-[#bbc9cf] flex items-start gap-1.5">
                            <span className="text-[#00daf3] font-bold">•</span>
                            <span>{reason}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-[11px] text-[#bbc9cf]">{routeData?.reasoning}</p>
                      )}
                    </div>
                  )}

                  {/* Tab 2: RISK BREAKDOWN */}
                  {activeTab === 'RISK' && (
                    <div className="space-y-2 text-xs font-sans min-h-[90px]">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">ICE RISK</span>
                          <span className="font-mono text-xs font-bold text-[#00daf3]">{recObj.risk?.ice_risk || 'Low (0.12)'}</span>
                        </div>
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">ICEBERG RISK</span>
                          <span className="font-mono text-xs font-bold text-[#77d1ff]">{recObj.risk?.iceberg_risk || 'Low (0.08)'}</span>
                        </div>
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">WEATHER RISK</span>
                          <span className="font-mono text-xs font-bold text-[#b3c6db]">{recObj.risk?.weather_risk || 'Low (0.05)'}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#bbc9cf] leading-snug">
                        {recObj.risk?.explanation || 'Path avoids high-density sea-ice ridges (>85% SIC) and iceberg drift zones.'}
                      </p>
                    </div>
                  )}

                  {/* Tab 3: FUEL & ETA EXPLANATION */}
                  {activeTab === 'FUEL_ETA' && (
                    <div className="space-y-2 text-xs font-sans min-h-[90px]">
                      <div className="bg-[#101d29] p-2 rounded border border-[#3c494e]/50">
                        <div className="text-[10px] font-bold text-[#00daf3] uppercase mb-0.5">Fuel Optimization</div>
                        <p className="text-[11px] text-[#bbc9cf] leading-snug">{recObj.fuel?.explanation || 'Fuel burn optimized by avoiding thick ice resistance.'}</p>
                      </div>
                      <div className="bg-[#101d29] p-2 rounded border border-[#3c494e]/50">
                        <div className="text-[10px] font-bold text-[#00daf3] uppercase mb-0.5">ETA Target</div>
                        <p className="text-[11px] text-[#bbc9cf] leading-snug">{recObj.eta?.explanation || 'On-schedule arrival planned at 14.2 KTS cruising speed.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: MODEL ENSEMBLE SUMMARY */}
                  {activeTab === 'MODELS' && (
                    <div className="space-y-1.5 text-[11px] text-[#bbc9cf] font-sans min-h-[90px]">
                      <p><strong className="text-[#00daf3]">Model 1 (Sea Ice):</strong> {recObj.model_summary?.model1 || 'Identified navigable low-concentration sea-ice leads.'}</p>
                      <p><strong className="text-[#77d1ff]">Model 2 (Icebergs):</strong> {recObj.model_summary?.model2 || 'Projected GRU drift vectors to clear iceberg clusters.'}</p>
                      <p><strong className="text-[#39ff14]">Model 3 (A* Engine):</strong> {recObj.model_summary?.model3 || 'Computed optimal least-cost path & explainability rationale.'}</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/analytics')}
                  className="w-full py-2.5 bg-[#00daf3] text-[#002020] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#35d4ff] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,218,243,0.4)]"
                >
                  COMMIT ROUTE & VIEW MANIFEST
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
