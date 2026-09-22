import React, { useEffect, useState } from 'react';
import { useAlertStore, useForecastStore, useVoyageStore } from '../store/useStore';
import { InteractivePolarMap } from '../components/map/InteractivePolarMap';
import { api, getLastVoyageInputs } from '../services/api';

export const AlertsPage: React.FC = () => {
  const { alerts, fetchAlerts, acknowledgeAlert } = useAlertStore();
  const { horizonDay, setHorizonDay } = useForecastStore();
  const { activeVoyageId, routeData, setRouteData, setLlmRecommendation } = useVoyageStore();
  const [rerouting, setRerouting] = useState(false);
  const [rerouteMsg, setRerouteMsg] = useState<string | null>(null);
  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showBathymetry, setShowBathymetry] = useState(false);
  const [showSarQuicklook, setShowSarQuicklook] = useState(false);

  useEffect(() => {
    fetchAlerts(activeVoyageId || undefined);
  }, [activeVoyageId, fetchAlerts]);

  const handleAck = async (id: string) => {
    await acknowledgeAlert(id);
  };

  const handleReroute = async () => {
    setRerouting(true);
    setRerouteMsg(null);
    try {
      const lastProfile = (getLastVoyageInputs()?.risk_tolerance || 'balanced').toLowerCase();
      const profile = (lastProfile === 'low' ? 'safest' : lastProfile === 'high' ? 'efficient' : lastProfile) as 'safest' | 'balanced' | 'efficient';
      const res = await api.recalculateRoute(profile, activeVoyageId);
      setRouteData(res.route);
      setLlmRecommendation(res.recommendation as any);
      if (activeVoyageId) await fetchAlerts(activeVoyageId);
      setRerouteMsg('Route recalculated from current real model outputs.');
    } catch (err: any) {
      setRerouteMsg(err.message || 'Reroute failed — model service unavailable.');
    } finally {
      setRerouting(false);
    }
  };

  const waypoints = routeData?.waypoints || [];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420] font-sans">
      {/* Live Map Background */}
      <InteractivePolarMap
        waypoints={waypoints}
        alerts={alerts}
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
        horizonDay={horizonDay}
        className="absolute inset-0 w-full h-full"
      />

      {/* Main Container / Diagnostics Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[440px] bg-[#071420]/90 backdrop-blur-2xl border-l border-[#aee9ff]/20 shadow-2xl flex flex-col z-20">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#3c494e]/40 flex items-center justify-between">
          <div>
            <h3 className="font-['Manrope'] font-bold text-xl text-white">Live Diagnostics</h3>
            <p className="font-mono text-xs text-[#bbc9cf] mt-0.5">SYS_MONITOR_ACTIVE • {alerts.length} HAZARDS</p>
          </div>
          <div className="flex items-center gap-2 bg-[#040C14] px-3 py-1.5 rounded-full border border-[#aee9ff]/30 shadow-[0_0_8px_rgba(174,233,255,0.3)]">
            <span className="w-2 h-2 rounded-full bg-[#aee9ff] animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-[#aee9ff]">MODEL_STREAMING</span>
          </div>
        </div>

        {/* Reroute Action */}
        <div className="px-6 pt-4">
          <button
            type="button"
            disabled={rerouting || !activeVoyageId}
            onClick={handleReroute}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f43f5e]/15 hover:bg-[#f43f5e]/25 border border-[#f43f5e]/50 text-[#ffb4ab] font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${rerouting ? 'animate-spin' : ''}`}>
              {rerouting ? 'sync' : 'alt_route'}
            </span>
            {rerouting ? 'RECALCULATING ROUTE...' : 'REROUTE AROUND ACTIVE HAZARDS'}
          </button>
          {rerouteMsg && (
            <p className="mt-2 text-[10px] font-mono text-[#bbc9cf] text-center">{rerouteMsg}</p>
          )}
        </div>

        {/* Alert Cards Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alerts.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-dashed border-[#3c494e]/40 rounded-xl bg-[#040C14]/50 my-6">
              <span className="material-symbols-outlined text-[48px] text-[#39ff14] mb-3">verified</span>
              <h4 className="font-['Manrope'] font-bold text-lg text-white">NO ACTIVE HAZARDS</h4>
              <p className="font-mono text-xs text-[#bbc9cf] mt-2 leading-relaxed max-w-[280px]">
                Current voyage route is clear of critical sea-ice, iceberg proximity, or high segment risk alerts.
              </p>
            </div>
          ) : (
            alerts.map((item) => {
              const isCritical = item.severity === 'CRITICAL' || item.severity === 'high';
              const isWarning = item.severity === 'WARNING' || item.severity === 'medium';
              const severityColor = isCritical ? 'text-[#f43f5e]' : isWarning ? 'text-[#f59e0b]' : 'text-[#38bdf8]';
              const borderStyle = isCritical
                ? 'border-[#f43f5e]/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : isWarning
                ? 'border-[#f59e0b]/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'border-[#38bdf8]/60 shadow-[0_0_12px_rgba(56,189,248,0.3)]';
              const barColor = isCritical ? 'bg-[#f43f5e]' : isWarning ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]';

              return (
                <div
                  key={item.alert_id}
                  className={`p-4 rounded-lg border relative overflow-hidden transition-all duration-300 ${
                    item.acknowledged
                      ? 'bg-[#14212d]/40 border-[#3c494e]/30 opacity-60 grayscale'
                      : `bg-[#14212d]/90 ${borderStyle}`
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[18px] ${severityColor}`}>
                        {isCritical ? 'warning' : isWarning ? 'error' : 'info'}
                      </span>
                      <span className={`font-mono text-xs font-bold uppercase ${severityColor}`}>
                        {item.severity}
                      </span>
                      {item.source_model && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#071420] text-[#aee9ff] border border-[#aee9ff]/20">
                          {item.source_model.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[#bbc9cf]">
                      {item.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mb-1">
                    {item.title || item.alert_type.replace('_', ' ').toUpperCase()}
                  </h4>
                  <p className="font-mono text-xs text-[#bbc9cf] mb-3 leading-relaxed">{item.message}</p>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[#8e9ca3] mb-2">
                    {item.latitude != null && item.longitude != null && (
                      <span>POS: {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°</span>
                    )}
                    {item.distance_from_route_km != null && (
                      <span>DIST: {item.distance_from_route_km.toFixed(1)} KM</span>
                    )}
                  </div>

                  {!item.acknowledged && (
                    <div className="flex justify-end pt-2 border-t border-[#3c494e]/30">
                      <button
                        type="button"
                        onClick={() => handleAck(item.alert_id)}
                        className="bg-[#f43f5e]/20 hover:bg-[#f43f5e]/30 border border-[#f43f5e]/50 text-[#f43f5e] font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer"
                      >
                        ACKNOWLEDGE
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Slider */}
        <div className="p-5 border-t border-[#3c494e]/40 bg-[#040C14]/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#bbc9cf] uppercase">
              7-DAY FORECAST OVERRIDE
            </span>
            <span className="font-mono text-xs font-bold text-[#aee9ff]">
              DAY {horizonDay}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="7"
            value={horizonDay}
            onChange={(e) => setHorizonDay(parseInt(e.target.value))}
            className="w-full accent-[#49d6ff] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
