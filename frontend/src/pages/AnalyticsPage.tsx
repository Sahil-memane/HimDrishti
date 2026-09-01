import React, { useState } from 'react';
import { useVoyageStore } from '../store/useStore';

export const AnalyticsPage: React.FC = () => {
  const { routeData, llmRecommendation } = useVoyageStore();
  const [filterQuery, setFilterQuery] = useState('');

  // Fallback demo waypoints
  const waypoints = routeData?.waypoints || [
    { sequence_no: 1, lat: -77.8460, lon: 166.6680, eta: '2024-11-18T08:00', cumulative_fuel_l: 0, segment_risk_score: 0.12, risk_factors: { ice_risk: 0.05, iceberg_risk: 0.04, weather_risk: 0.03 } },
    { sequence_no: 2, lat: -78.1022, lon: 165.9011, eta: '2024-11-18T12:30', cumulative_fuel_l: 4250, segment_risk_score: 0.18, risk_factors: { ice_risk: 0.08, iceberg_risk: 0.05, weather_risk: 0.05 } },
    { sequence_no: 3, lat: -79.4501, lon: 163.2205, eta: '2024-11-18T19:15', cumulative_fuel_l: 9800, segment_risk_score: 0.45, risk_factors: { ice_risk: 0.22, iceberg_risk: 0.15, weather_risk: 0.08 } },
    { sequence_no: 4, lat: -80.9920, lon: 160.1145, eta: '2024-11-19T02:40', cumulative_fuel_l: 15600, segment_risk_score: 0.22, risk_factors: { ice_risk: 0.10, iceberg_risk: 0.07, weather_risk: 0.05 } },
    { sequence_no: 5, lat: -82.1044, lon: 155.8820, eta: '2024-11-19T10:00', cumulative_fuel_l: 22400, segment_risk_score: 0.88, risk_factors: { ice_risk: 0.48, iceberg_risk: 0.30, weather_risk: 0.10 } },
    { sequence_no: 6, lat: -83.5501, lon: 150.2291, eta: '2024-11-19T16:45', cumulative_fuel_l: 27100, segment_risk_score: 0.51, risk_factors: { ice_risk: 0.25, iceberg_risk: 0.18, weather_risk: 0.08 } },
    { sequence_no: 7, lat: -85.1122, lon: 142.9904, eta: '2024-11-19T23:20', cumulative_fuel_l: 32800, segment_risk_score: 0.31, risk_factors: { ice_risk: 0.15, iceberg_risk: 0.10, weather_risk: 0.06 } },
    { sequence_no: 8, lat: -86.8840, lon: 130.4411, eta: '2024-11-20T05:15', cumulative_fuel_l: 38150, segment_risk_score: 0.24, risk_factors: { ice_risk: 0.12, iceberg_risk: 0.08, weather_risk: 0.04 } },
    { sequence_no: 9, lat: -88.4011, lon: 105.2201, eta: '2024-11-20T10:30', cumulative_fuel_l: 42900, segment_risk_score: 0.15, risk_factors: { ice_risk: 0.07, iceberg_risk: 0.05, weather_risk: 0.03 } },
    { sequence_no: 10, lat: -90.0000, lon: 0.0000, eta: '2024-11-20T14:00', cumulative_fuel_l: 45200, segment_risk_score: 0.05, risk_factors: { ice_risk: 0.02, iceberg_risk: 0.02, weather_risk: 0.01 } },
  ];

  const filteredWaypoints = waypoints.filter(
    (w) =>
      w.sequence_no.toString().includes(filterQuery) ||
      w.lat.toFixed(4).includes(filterQuery) ||
      w.lon.toFixed(4).includes(filterQuery)
  );

  const totalDist = routeData?.total_distance_km ?? 1452.8;
  const totalFuel = routeData?.total_fuel_estimate_l ?? 45200;
  const overallRisk = routeData?.overall_risk_score ?? 0.34;
  const reasoning = llmRecommendation || routeData?.reasoning || 'Model 3 A* Engine: Generated optimal navigation path bypassing high-density sea-ice ridges with a 94.2% confidence score.';

  return (
    <div className="p-6 md:p-10 min-h-screen flex flex-col font-sans pb-20">
      {/* Canvas Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope'] text-3xl font-bold text-white tracking-tight">
            Alpha Centauri Transpolar
          </h2>
          <p className="font-mono text-xs text-[#bbc9cf] mt-1">
            Manifest ID: <span className="text-[#aee9ff] font-bold">TR-99-AXB</span> | Active Route
          </p>
        </div>
      </div>

      {/* Model 3 AI Recommendation Box */}
      <div className="glass-panel p-5 rounded-xl border border-[#aee9ff]/30 mb-8 bg-[#101d29]/80 shadow-lg">
        <div className="flex items-center gap-2 text-[#aee9ff] mb-2">
          <span className="material-symbols-outlined text-[20px]">psychology</span>
          <h3 className="font-bold text-xs uppercase tracking-wider">
            MODEL 3 ROUTING ENGINE — AI EXPLAINABILITY & RECOMMENDATION
          </h3>
        </div>
        <p className="text-sm text-[#d7e4f5] leading-relaxed font-sans">{reasoning}</p>
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
          <div className="font-mono text-lg font-bold text-white">2024-11-20T14:00Z</div>
          <div className="font-mono text-[10px] text-[#77d1ff]">T-MINUS 48:12:00</div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel rounded-xl p-5 border border-[#aee9ff]/20 flex flex-col gap-2">
          <span className="text-xs font-bold text-[#bbc9cf] uppercase">Total Fuel Est</span>
          <div className="font-mono text-2xl font-bold text-white">
            {totalFuel.toLocaleString()} <span className="text-[#77d1ff] text-sm">L</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel rounded-xl p-5 border border-[#39ff14]/30 flex flex-col gap-2 shadow-[0_0_15px_rgba(57,255,20,0.08)]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#bbc9cf] uppercase">Overall Risk</span>
            <span className="px-2 py-0.5 rounded bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] text-[10px] font-bold uppercase">
              Optimal
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
            Voyage Manifest & Per-Leg Risk Breakdown
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

        <div className="flex-1 overflow-x-auto bg-[#040C14]/40">
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
              {filteredWaypoints.map((w) => (
                <tr key={w.sequence_no} className="hover:bg-[#aee9ff]/5 transition-colors">
                  <td className="py-3 px-6 text-[#bbc9cf]">{String(w.sequence_no).padStart(3, '0')}</td>
                  <td className="py-3 px-6 font-bold text-white">
                    {w.lat.toFixed(4)}, {w.lon.toFixed(4)}
                  </td>
                  <td className="py-3 px-6 text-[#bbc9cf]">{w.eta}</td>
                  <td className="py-3 px-6 text-right font-bold">{w.cumulative_fuel_l.toLocaleString()}</td>
                  <td className="py-3 px-6 text-center text-[#aee9ff]">
                    {w.risk_factors ? w.risk_factors.ice_risk.toFixed(2) : '0.10'}
                  </td>
                  <td className="py-3 px-6 text-center text-[#77d1ff]">
                    {w.risk_factors ? w.risk_factors.iceberg_risk.toFixed(2) : '0.08'}
                  </td>
                  <td className="py-3 px-6 text-center text-[#b3c6db]">
                    {w.risk_factors ? w.risk_factors.weather_risk.toFixed(2) : '0.05'}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        w.segment_risk_score > 0.6
                          ? 'bg-[#ff3333]/20 border border-[#ff3333]/50 text-[#ffb4ab]'
                          : w.segment_risk_score > 0.3
                          ? 'bg-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00]'
                          : 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]'
                      }`}
                    >
                      {w.segment_risk_score.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
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
