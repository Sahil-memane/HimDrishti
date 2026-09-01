import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoyageStore } from '../store/useStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeData, llmRecommendation } = useVoyageStore();

  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<'SAFEST' | 'BALANCED' | 'EFFICIENT'>('BALANCED');

  // Fallback demo waypoints if no route data calculated yet
  const waypoints = routeData?.waypoints || [
    { sequence_no: 1, lat: -60.0, lon: 40.0, eta: '2024-11-18T08:00', cumulative_fuel_l: 0, segment_risk_score: 0.12 },
    { sequence_no: 2, lat: -65.2, lon: 70.4, eta: '2024-11-18T18:30', cumulative_fuel_l: 14200, segment_risk_score: 0.18 },
    { sequence_no: 3, lat: -71.8, lon: 110.1, eta: '2024-11-19T10:15', cumulative_fuel_l: 38400, segment_risk_score: 0.45 },
    { sequence_no: 4, lat: -77.846, lon: 166.6682, eta: '2024-11-20T14:00', cumulative_fuel_l: 84500, segment_risk_score: 0.24 },
  ];

  const overallRisk = routeData?.overall_risk_score ?? 0.24;
  const totalFuel = routeData?.total_fuel_estimate_l ?? 84500;
  const etaText = routeData?.eta || '4d 12h';
  const reasoning = llmRecommendation || routeData?.reasoning || 'Selected route accepts +0.12 risk delta to bypass significant SIC consolidation at sector 4G. Saves approx 4,200L fuel vs Safest route while maintaining acceptable structural safety margins.';

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420]">
      {/* Map Background Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCEdGSp3fYMIdFQSeINJ2iTZw9kAFXq-AT-HAVHPuNqJ_IFr4GPtsrc2MB19CJ80qzrjEVqu2OYF3ScSn9EabeNlusuW0Kf_m4nPdWgmrdZnBdVMnZZ849XPFK2Lb9DhRyYkbUfJEkXh4pGPfJMs6dqKr3ocmzcNOzmQSeUFNXXLcw2twm0hkmsXJhWX7wPGPhj8ZBQ4EbvpqZUkmoHdIH0c_qWqTsRlP1AAePrxdjsVKu13Gm7MwAG')`
        }}
      />

      {/* SVG Route Visualization Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Confidence Buffer Polyline */}
        <path
          d="M 150 650 L 300 550 L 450 600 L 600 450 L 750 350 L 850 200 L 900 220 L 780 380 L 620 480 L 470 630 L 320 580 Z"
          fill="rgba(174, 233, 255, 0.05)"
          stroke="rgba(174, 233, 255, 0.15)"
          strokeWidth="1"
        />

        {/* Main Route Line */}
        <path
          d="M 160 665 L 310 565 L 460 615 L 610 465 L 765 365 L 875 210"
          fill="none"
          stroke="#aee9ff"
          strokeWidth="3"
          filter="url(#cyanGlow)"
        />

        {/* Waypoints */}
        <circle cx="160" cy="665" r="5" fill="#071420" stroke="#aee9ff" strokeWidth="2" />
        <circle cx="460" cy="615" r="5" fill="#071420" stroke="#aee9ff" strokeWidth="2" />
        <circle cx="610" cy="465" r="5" fill="#071420" stroke="#aee9ff" strokeWidth="2" />
        <circle cx="875" cy="210" r="7" fill="#aee9ff" filter="url(#cyanGlow)" />

        {/* Current Position Marker */}
        <polygon points="310,555 315,570 305,570" fill="#aee9ff" filter="url(#cyanGlow)" transform="rotate(30 310 565)" />

        {/* Sea-Ice & Risk Heatmaps (Controlled by Toggles) */}
        {showSic && (
          <path
            d="M 600 200 Q 700 150 800 250 T 950 150 T 750 300 Z"
            fill="rgba(209, 228, 251, 0.2)"
            filter="blur(15px)"
          />
        )}

        {showIcebergs && (
          <g id="layer-icebergs">
            <circle cx="400" cy="500" r="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
            <polygon points="400,495 405,505 395,505" fill="#ffffff" />
            <circle cx="650" cy="350" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
            <polygon points="650,347 653,353 647,353" fill="#ffffff" />
          </g>
        )}

        {showRiskZones && (
          <path
            d="M 50 400 Q 150 300 250 450 T 400 350 T 200 600 Z"
            fill="rgba(255, 51, 51, 0.15)"
            stroke="rgba(255, 51, 51, 0.4)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Floating Overlay Panels */}
      <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between">
        {/* Top Row Controls */}
        <div className="flex justify-between items-start pointer-events-auto">
          {/* Overlays Toggle Box */}
          <div className="glass-panel rounded-xl p-4 w-52 flex flex-col gap-2.5 shadow-xl border border-[#aee9ff]/20">
            <h3 className="font-bold text-xs text-[#bbc9cf] uppercase tracking-wider mb-1">
              Map Overlays
            </h3>
            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
              <span>Sea-Ice (SIC)</span>
              <input
                type="checkbox"
                checked={showSic}
                onChange={(e) => setShowSic(e.target.checked)}
                className="rounded text-[#aee9ff] focus:ring-0 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
              <span>Icebergs</span>
              <input
                type="checkbox"
                checked={showIcebergs}
                onChange={(e) => setShowIcebergs(e.target.checked)}
                className="rounded text-[#aee9ff] focus:ring-0 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#ffb4ab]">
              <span>Risk Zones</span>
              <input
                type="checkbox"
                checked={showRiskZones}
                onChange={(e) => setShowRiskZones(e.target.checked)}
                className="rounded text-[#ffb4ab] focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Telemetry Stats */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-1 items-end text-right border border-[#aee9ff]/20 shadow-xl">
            <h3 className="font-bold text-xs text-[#bbc9cf] uppercase tracking-wider">
              Vessel Telemetry
            </h3>
            <div className="flex items-baseline gap-1 font-mono text-xl font-bold text-white">
              14.2 <span className="text-xs text-[#bbc9cf]">KTS</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono text-base text-white">
              045° <span className="text-xs text-[#bbc9cf]">HDG</span>
            </div>
          </div>
        </div>

        {/* Bottom Row Controls */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pointer-events-auto">
          {/* Active Route Metrics */}
          <div className="glass-panel rounded-xl p-6 w-full md:w-80 shadow-2xl flex flex-col gap-4 border border-[#aee9ff]/30">
            <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-3">
              <h2 className="font-bold text-lg text-[#aee9ff]">Active Route</h2>
              <span className="px-2 py-0.5 rounded bg-[#aee9ff]/10 border border-[#aee9ff]/30 text-[#aee9ff] font-bold text-[10px] tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#aee9ff] animate-pulse" />
                TRACKING
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase block">
                  ETA TARGET
                </span>
                <span className="font-mono text-white text-lg font-bold">{etaText}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase block">
                  EST. FUEL
                </span>
                <span className="font-mono text-white text-lg font-bold">
                  {totalFuel.toLocaleString()} <span className="text-xs text-[#bbc9cf]">L</span>
                </span>
              </div>
            </div>

            {/* Overall Risk Index */}
            <div className="bg-[#101d29] p-3 rounded-lg border border-[#3c494e]/50 flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase">
                  OVERALL RISK INDEX
                </span>
                <span className="font-mono text-[#aee9ff] font-bold">
                  {overallRisk <= 0.3 ? 'LOW' : overallRisk <= 0.6 ? 'MEDIUM' : 'HIGH'} ({overallRisk.toFixed(2)})
                </span>
              </div>
              <div className="w-full bg-[#071420] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#aee9ff] h-full rounded-full shadow-[0_0_8px_#aee9ff]"
                  style={{ width: `${Math.min(100, Math.max(10, overallRisk * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* AI Rationale & Optimization Card */}
          <div className="glass-panel rounded-xl p-6 w-full md:w-96 shadow-2xl flex flex-col gap-4 border border-[#aee9ff]/30">
            <h3 className="font-bold text-xs text-[#bbc9cf] uppercase tracking-wider">
              Optimization Parameter
            </h3>

            {/* Profile Selector */}
            <div className="flex bg-[#1d2b3d] p-1 rounded-lg border border-[#3c494e]">
              {(['SAFEST', 'BALANCED', 'EFFICIENT'] as const).map((prof) => (
                <button
                  key={prof}
                  onClick={() => setSelectedProfile(prof)}
                  className={`flex-1 py-1.5 font-bold text-xs rounded transition-all cursor-pointer ${
                    selectedProfile === prof
                      ? 'bg-[#aee9ff]/20 text-[#aee9ff] border border-[#aee9ff]/40 shadow-[0_0_8px_rgba(174,233,255,0.3)]'
                      : 'text-[#bbc9cf] hover:text-white'
                  }`}
                >
                  {prof}
                </button>
              ))}
            </div>

            {/* AI Rationale */}
            <div className="bg-[#101d29] p-3 rounded-lg border border-[#3c494e]/50 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[#aee9ff]">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <h4 className="font-bold text-[10px] uppercase tracking-wider">
                  MODEL 3 AI RATIONALE & RECOMMENDATION
                </h4>
              </div>
              <p className="text-xs text-[#bbc9cf] leading-relaxed font-sans">{reasoning}</p>
            </div>

            <button
              onClick={() => navigate('/analytics')}
              className="w-full py-3 bg-[#aee9ff] text-[#003543] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#35d4ff] transition-all cursor-pointer shadow-[0_0_15px_rgba(174,233,255,0.3)]"
            >
              COMMIT ROUTE & VIEW MANIFEST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
