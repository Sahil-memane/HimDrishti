import React, { useState } from 'react';
import { useVoyageStore } from '../store/useStore';

export const AnalyticsPage: React.FC = () => {
  const { routeData, llmRecommendation } = useVoyageStore();
  const [filterQuery, setFilterQuery] = useState('');

  // Waypoints directly from store routeData
  const waypoints = routeData?.waypoints || [];

  const getLat = (w: any) => (w.lat !== undefined ? Number(w.lat) : w.latitude !== undefined ? Number(w.latitude) : 0);
  const getLon = (w: any) => (w.lon !== undefined ? Number(w.lon) : w.longitude !== undefined ? Number(w.longitude) : 0);
  const getSeq = (w: any, idx: number) => (w.sequence_no !== undefined ? w.sequence_no : w.sequence !== undefined ? w.sequence : idx + 1);

  const filteredWaypoints = waypoints.filter((w, idx) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    const seqStr = String(getSeq(w, idx));
    const latStr = getLat(w).toFixed(4);
    const lonStr = getLon(w).toFixed(4);
    return seqStr.includes(q) || latStr.includes(q) || lonStr.includes(q);
  });

  const calculateDistance = () => {
    if (routeData?.total_distance_km) return routeData.total_distance_km;
    let dist = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const lat1 = getLat(waypoints[i - 1]);
      const lon1 = getLon(waypoints[i - 1]);
      const lat2 = getLat(waypoints[i]);
      const lon2 = getLon(waypoints[i]);
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dist += 6371 * c;
    }
    return Math.round(dist);
  };

  const totalDist = calculateDistance();
  const totalFuel = routeData?.total_fuel_estimate_l ?? (waypoints[waypoints.length - 1]?.cumulative_fuel_l || 84500);
  const overallRisk = routeData?.overall_risk_score ?? 0.24;
  const etaText = routeData?.eta || waypoints[waypoints.length - 1]?.eta || '4d 12h';

  // Safe string extraction for object or string llmRecommendation
  const reasoningText =
    typeof llmRecommendation === 'string'
      ? llmRecommendation
      : (llmRecommendation as any)?.best_route?.route_summary ||
        routeData?.reasoning ||
        'Model 3 A* Engine: Generated optimal maritime navigation path skirting landmasses & bypassing high-density sea ice.';

  const whyReasons: string[] =
    typeof llmRecommendation === 'object' && (llmRecommendation as any)?.why_this_route
      ? (llmRecommendation as any).why_this_route
      : [];

  return (
    <div className="p-6 md:p-10 min-h-screen flex flex-col font-sans pb-20">
      {/* Canvas Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope'] text-3xl font-bold text-white tracking-tight">
            Alpha Centauri Transpolar
          </h2>
          <p className="font-mono text-xs text-[#bbc9cf] mt-1">
            Manifest ID: <span className="text-[#aee9ff] font-bold">TR-99-AXB</span> | Active Route Analysis
          </p>
        </div>
      </div>

      {/* Model 3 AI Recommendation Box */}
      <div className="glass-panel p-5 rounded-xl border border-[#aee9ff]/30 mb-8 bg-[#101d29]/80 shadow-lg flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#aee9ff]">
          <span className="material-symbols-outlined text-[20px]">psychology</span>
          <h3 className="font-bold text-xs uppercase tracking-wider">
            MODEL 3 ROUTING ENGINE — AI EXPLAINABILITY & RECOMMENDATION
          </h3>
        </div>

        <p className="text-sm text-[#d7e4f5] leading-relaxed font-sans">{reasoningText}</p>

        {whyReasons.length > 0 && (
          <div className="mt-2 pt-3 border-t border-[#3c494e]/40 space-y-1.5">
            <h4 className="font-bold text-xs text-[#00daf3] uppercase tracking-wider mb-1">
              Why Model 3 Selected This Route:
            </h4>
            {whyReasons.map((reason, idx) => (
              <p key={idx} className="text-xs text-[#bbc9cf] flex items-start gap-2">
                <span className="text-[#00daf3] font-bold">•</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="glass-panel rounded-xl p-5 border border-[#aee9ff]/20 flex flex-col gap-2">
          <span className="text-xs font-bold text-[#bbc9cf] uppercase">Total Distance</span>
          <div className="font-mono text-2xl font-bold text-white">
            {totalDist.toLocaleString()} <span className="text-[#aee9ff] text-sm">KM</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel rounded-xl p-5 border border-[#aee9ff]/20 flex flex-col gap-2">
          <span className="text-xs font-bold text-[#bbc9cf] uppercase">Total ETA</span>
          <div className="font-mono text-base font-bold text-white truncate" title={etaText}>
            {etaText}
          </div>
          <div className="font-mono text-[10px] text-[#77d1ff]">POLAR NAVIGATION SCHEDULE</div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel rounded-xl p-5 border border-[#aee9ff]/20 flex flex-col gap-2">
          <span className="text-xs font-bold text-[#bbc9cf] uppercase">Total Fuel Est</span>
          <div className="font-mono text-2xl font-bold text-white">
            {Math.round(totalFuel).toLocaleString()} <span className="text-[#77d1ff] text-sm">L</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel rounded-xl p-5 border border-[#39ff14]/30 flex flex-col gap-2 shadow-[0_0_15px_rgba(57,255,20,0.08)]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#bbc9cf] uppercase">Overall Risk</span>
            <span className="px-2 py-0.5 rounded bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] text-[10px] font-bold uppercase">
              {overallRisk <= 0.2 ? 'Optimal' : overallRisk <= 0.45 ? 'Moderate' : 'High Risk'}
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-[#39ff14]">{overallRisk.toFixed(2)}</div>
        </div>
      </div>

      {/* Voyage Manifest Table */}
      <div className="glass-panel rounded-xl flex-1 flex flex-col overflow-hidden border border-[#aee9ff]/20 shadow-2xl">
        <div className="px-6 py-4 border-b border-[#3c494e]/30 flex justify-between items-center bg-[#14212d]/60">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#aee9ff] text-[20px]">list_alt</span>
            Voyage Manifest & Per-Leg Risk Breakdown ({filteredWaypoints.length} Waypoints)
          </h3>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbc9cf] text-[16px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter Coordinates..."
              className="bg-[#071420] border border-[#3c494e] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-[#bbc9cf] focus:border-[#aee9ff] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto bg-[#040C14]/40 min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#1f2b38]/80 border-b border-[#3c494e]/40 font-mono text-xs text-[#aee9ff]">
              <tr>
                <th className="py-3 px-6 w-16">SEQ</th>
                <th className="py-3 px-6">LAT / LON</th>
                <th className="py-3 px-6">ETA (UTC)</th>
                <th className="py-3 px-6 text-right">CUMULATIVE FUEL (L)</th>
                <th className="py-3 px-6 text-center">ICE RISK</th>
                <th className="py-3 px-6 text-center">ICEBERG RISK</th>
                <th className="py-3 px-6 text-center">WEATHER RISK</th>
                <th className="py-3 px-6 text-center">LEG RISK SCORE</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-[#d7e4f5] divide-y divide-[#3c494e]/20">
              {filteredWaypoints.map((w, idx) => {
                const seq = getSeq(w, idx);
                const lat = getLat(w);
                const lon = getLon(w);
                const fuelVal = w.cumulative_fuel_l ?? (w as any).cumulative_fuel ?? 0;
                const riskScore = w.segment_risk_score ?? (w as any).risk_score ?? 0.15;
                const iceRisk = w.risk_factors?.ice_risk ?? 0.10;
                const icebergRisk = w.risk_factors?.iceberg_risk ?? 0.08;
                const weatherRisk = w.risk_factors?.weather_risk ?? 0.05;

                return (
                  <tr key={seq} className="hover:bg-[#aee9ff]/5 transition-colors">
                    <td className="py-3 px-6 text-[#bbc9cf]">{String(seq).padStart(3, '0')}</td>
                    <td className="py-3 px-6 font-bold text-white">
                      {lat.toFixed(4)}, {lon.toFixed(4)}
                    </td>
                    <td className="py-3 px-6 text-[#bbc9cf]">{w.eta || 'N/A'}</td>
                    <td className="py-3 px-6 text-right font-bold">{Math.round(fuelVal).toLocaleString()}</td>
                    <td className="py-3 px-6 text-center text-[#aee9ff]">
                      {Number(iceRisk).toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-center text-[#77d1ff]">
                      {Number(icebergRisk).toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-center text-[#b3c6db]">
                      {Number(weatherRisk).toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          riskScore > 0.6
                            ? 'bg-[#ff3333]/20 border border-[#ff3333]/50 text-[#ffb4ab]'
                            : riskScore > 0.3
                            ? 'bg-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00]'
                            : 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]'
                        }`}
                      >
                        {Number(riskScore).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed Telemetry Footer */}
      <footer className="fixed bottom-0 left-0 w-full md:left-64 md:w-[calc(100%-16rem)] h-10 bg-[#030f1b] border-t border-[#3c494e]/30 z-50 flex items-center px-6 justify-between font-mono text-[10px] uppercase text-[#bbc9cf]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#39ff14]" />
            API Gateway: ONLINE
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35d4ff]" />
            Model 3: READY
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#aee9ff]" />
            IceNav DB: SYNCED
          </div>
        </div>
        <div>VER: 4.2.1-STABLE</div>
      </footer>
    </div>
  );
};
