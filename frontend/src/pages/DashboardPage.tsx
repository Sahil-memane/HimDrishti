import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoyageStore } from '../store/useStore';
import { api, buildModel3Recommendation, getLastVoyageInputs, KNOWN_VESSELS, type Model3Recommendation } from '../services/api';
import { InteractivePolarMap } from '../components/map/InteractivePolarMap';
import { DataProvenanceBar } from '../components/layout/DataProvenanceBar';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeData, llmRecommendation, activeVoyageId, setRouteData, setLlmRecommendation } = useVoyageStore();

  const inputs = getLastVoyageInputs();
  const initialProfRaw = (inputs?.risk_tolerance || 'balanced').toLowerCase();
  const initialProfile = initialProfRaw === 'low' ? 'safest' : initialProfRaw === 'high' ? 'efficient' : (initialProfRaw as 'safest' | 'balanced' | 'efficient');

  // Default ON: the route makes little sense without seeing the real sea-ice
  // context it was computed against.
  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showBathymetry, setShowBathymetry] = useState(false);
  const [showSarQuicklook, setShowSarQuicklook] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'safest' | 'balanced' | 'efficient'>(initialProfile);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'WHY' | 'RISK' | 'FUEL_ETA' | 'MODELS'>('WHY');

  const [isMinimized, setIsMinimized] = useState(false);

  const [recalculatingError, setRecalculatingError] = useState<string | null>(null);

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
      : buildModel3Recommendation(selectedProfile, routeData as any);

  const overallRisk = routeData?.overall_risk_score ?? 0;
  const totalFuel = routeData?.total_fuel_estimate_l ?? 0;
  const etaText = routeData?.eta_formatted || (typeof routeData?.eta === 'string' ? routeData.eta : '--');

  // Real vessel telemetry: speed is the vessel's own submitted cruising speed
  // (not fabricated); heading is the real bearing from the first to second
  // waypoint of the computed route.
  const realSpeedKnots = inputs?.speed_knots;
  const realVesselName = inputs?.vessel_id ? KNOWN_VESSELS[inputs.vessel_id] : undefined;
  const realHeadingDeg = (() => {
    if (waypoints.length < 2) return null;
    const [a, b] = waypoints;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLon = toRad(b.lon - a.lon);
    const y = Math.sin(dLon) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLon);
    return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
  })();

  // Whether the currently displayed AI explainability text is real (from a
  // real Mistral call), a real-data server-side template (Mistral was
  // unreachable), or a fully client-fabricated placeholder.
  const explainabilitySource: 'live' | 'server_template' | 'client_fallback' = (recObj as any)._clientFallback
    ? 'client_fallback'
    : recObj.llm?.is_fallback
    ? 'server_template'
    : 'live';

  // Recalculate route when optimization profile changes
  const handleProfileSelect = async (prof: 'safest' | 'balanced' | 'efficient') => {
    if (prof === selectedProfile && !recalculating) return;
    setSelectedProfile(prof);
    setRecalculating(true);
    setRecalculatingError(null);
    try {
      const res = await api.recalculateRoute(prof, activeVoyageId);
      setRouteData(res.route);
      setLlmRecommendation(res.recommendation as any);
    } catch (err: any) {
      console.warn('Failed to recalculate route profile:', err);
      setRecalculatingError(err.message || 'ROUTE CALCULATION FAILED');
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
        vesselHeading={realHeadingDeg ?? undefined}
        vesselSpeed={realSpeedKnots ?? undefined}
        vesselName={realVesselName}
        showSeaIce={showSic}
        showIcebergs={showIcebergs}
        showRiskZones={showRiskZones}
        showBathymetry={showBathymetry}
        showSarQuicklook={showSarQuicklook}
        sarBbox={routeData?.data_provenance?.satellite_bbox}
        sarImageUrl={routeData?.data_provenance?.satellite_image_url}
        voyageId={activeVoyageId}
        onToggleSeaIce={(show) => setShowSic(show)}
        onToggleIcebergs={(show) => setShowIcebergs(show)}
        onToggleRiskZones={(show) => setShowRiskZones(show)}
        onToggleBathymetry={(show) => setShowBathymetry(show)}
        onToggleSarQuicklook={(show) => setShowSarQuicklook(show)}
        activeRiskProfile={selectedProfile}

        className="absolute inset-0 w-full h-full"
      />

      {/* Floating Overlay Panels */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
        {/* Top Row: Data Provenance (left) + Telemetry Stats (right) — wraps
            instead of clipping off-screen when both panels are wide. */}
        <div className="flex flex-wrap justify-between items-start pointer-events-auto gap-3">
          <DataProvenanceBar provenance={routeData?.data_provenance} />
          <div className="flex-shrink-0 glass-panel rounded-xl px-3.5 py-2 border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md shadow-xl flex items-center gap-4">
            <div className="flex items-center gap-1.5 border-r border-[#3c494e]/40 pr-3 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse flex-shrink-0" />
              <span className="font-bold text-[10px] text-[#bbc9cf] uppercase tracking-wider">
                Vessel Telemetry
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold text-white whitespace-nowrap">
              <div>
                {realSpeedKnots != null ? realSpeedKnots.toFixed(1) : '--'} <span className="text-[10px] text-[#bbc9cf]">KTS</span>
              </div>
              <div className="text-[#3c494e]">|</div>
              <div>
                {realHeadingDeg != null ? `${Math.round(realHeadingDeg).toString().padStart(3, '0')}°` : '---°'} <span className="text-[10px] text-[#bbc9cf]">HDG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Route still computing (real backend pipeline in progress) */}
        {!routeData && (
          <div className="pointer-events-auto self-center glass-panel p-5 rounded-xl border border-[#00daf3]/50 bg-[#071420]/95 backdrop-blur-lg shadow-2xl flex flex-col items-center gap-3 max-w-md text-center">
            <span className="material-symbols-outlined text-[32px] text-[#00daf3] animate-spin">sync</span>
            <div className="font-bold text-sm text-white">Computing real route via Model 1 → 2 → 3...</div>
            <p className="text-xs text-[#bbc9cf]">Fetching live satellite ice data, iceberg drift physics, and Sentinel-1 SAR hazard scan. This can take up to a minute.</p>
          </div>
        )}

        {/* Recalculating Error Banner */}
        {recalculatingError && (
          <div className="pointer-events-auto self-center glass-panel p-3.5 rounded-xl border border-[#ff3333]/60 bg-[#1a0709]/95 backdrop-blur-lg shadow-2xl flex items-center gap-4 max-w-lg animate-fadeIn text-[#ffb4ab] text-xs font-mono">
            <span>⚠️ {recalculatingError}</span>
            <button
              onClick={() => setRecalculatingError(null)}
              className="text-[#ffb4ab] hover:text-white text-[10px] uppercase font-mono border border-[#ff3333]/40 px-2 py-0.5 rounded cursor-pointer ml-auto"
            >
              DISMISS
            </button>
          </div>
        )}



        {/* Bottom Row Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4 pointer-events-none w-full">
          {/* Active Route Metrics */}
          <div className="pointer-events-auto glass-panel rounded-xl p-4 md:p-5 w-full lg:w-80 shadow-2xl flex flex-col gap-3 border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-2">
              <h2 className="font-bold text-base text-[#00daf3]">Active Route</h2>
              <span className="px-2 py-0.5 rounded bg-[#00daf3]/10 border border-[#00daf3]/30 text-[#00daf3] font-bold text-[10px] tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00daf3] animate-pulse" />
                {recalculating ? 'Generating route...' : 'TRACKING'}
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
          <div className="pointer-events-auto glass-panel rounded-xl p-4 md:p-5 w-full lg:w-[480px] shadow-2xl flex flex-col gap-3 border border-[#00daf3]/40 bg-[#071420]/95 backdrop-blur-xl transition-all duration-300">
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
                      <span
                        title={
                          explainabilitySource === 'live'
                            ? 'Live natural-language explanation generated by Mistral AI'
                            : explainabilitySource === 'server_template'
                            ? 'Mistral AI was unreachable — this text is templated from real route/risk data, not AI-generated'
                            : 'Backend recommendation unavailable — this is a client-side estimate, not real model output'
                        }
                        className={`ml-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                          explainabilitySource === 'live'
                            ? 'text-[#39ff14] border-[#39ff14]/40 bg-[#39ff14]/10'
                            : explainabilitySource === 'server_template'
                            ? 'text-[#ffcc00] border-[#ffcc00]/40 bg-[#ffcc00]/10'
                            : 'text-[#ffb4ab] border-[#ffb4ab]/40 bg-[#ffb4ab]/10'
                        }`}
                      >
                        {explainabilitySource === 'live' ? 'LIVE AI' : explainabilitySource === 'server_template' ? 'TEMPLATED' : 'ESTIMATE'}
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
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">ICE RISK</span>
                          <span className="font-mono text-xs font-bold text-[#00daf3]">{recObj.risk?.ice_risk || 'N/A'}</span>
                        </div>
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">ICEBERG RISK</span>
                          <span className="font-mono text-xs font-bold text-[#77d1ff]">{recObj.risk?.iceberg_risk || 'N/A'}</span>
                        </div>
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">WEATHER RISK</span>
                          <span className="font-mono text-xs font-bold text-[#b3c6db]">{recObj.risk?.weather_risk || 'N/A'}</span>
                        </div>
                        <div className="bg-[#101d29] p-1.5 rounded border border-[#3c494e]/50">
                          <span className="text-[9px] font-bold text-[#bbc9cf] block">SATELLITE RISK</span>
                          <span className="font-mono text-xs font-bold text-[#c084fc]">
                            {routeData?.satellite_risk != null ? routeData.satellite_risk.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#bbc9cf] leading-snug">
                        {recObj.risk?.explanation || 'No risk explanation available for this route yet.'}
                      </p>
                    </div>
                  )}

                  {/* Tab 3: FUEL & ETA EXPLANATION */}
                  {activeTab === 'FUEL_ETA' && (
                    <div className="space-y-2 text-xs font-sans min-h-[90px]">
                      <div className="bg-[#101d29] p-2 rounded border border-[#3c494e]/50">
                        <div className="text-[10px] font-bold text-[#00daf3] uppercase mb-0.5">Fuel Optimization</div>
                        <p className="text-[11px] text-[#bbc9cf] leading-snug">{recObj.fuel?.explanation || 'No fuel explanation available for this route yet.'}</p>
                      </div>
                      <div className="bg-[#101d29] p-2 rounded border border-[#3c494e]/50">
                        <div className="text-[10px] font-bold text-[#00daf3] uppercase mb-0.5">ETA Target</div>
                        <p className="text-[11px] text-[#bbc9cf] leading-snug">{recObj.eta?.explanation || 'No ETA explanation available for this route yet.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: MODEL ENSEMBLE SUMMARY */}
                  {activeTab === 'MODELS' && (
                    <div className="space-y-1.5 text-[11px] text-[#bbc9cf] font-sans min-h-[90px]">
                      <p><strong className="text-[#00daf3]">Model 1 (Sea Ice LSTM):</strong> {recObj.model_summary?.model1 || 'Real trained LSTM forecast from live satellite sea-ice observations.'}</p>
                      <p><strong className="text-[#77d1ff]">Model 2 (Iceberg Drift):</strong> {recObj.model_summary?.model2 || 'Physics-informed drift model using live wind + ocean current data.'}</p>
                      <p><strong className="text-[#39ff14]">Model 3 (A* + Satellite):</strong> {recObj.model_summary?.model3 || 'A* least-cost path fused with real Sentinel-1 SAR hazard detections.'}</p>
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
