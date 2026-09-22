import React, { useState } from 'react';

interface MapLegendProps {
  showSeaIce?: boolean;
  showIcebergs?: boolean;
  showIcebergDrift?: boolean;
  showRiskZones?: boolean;
  showBathymetry?: boolean;
  showSarQuicklook?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showSeaIce = true,
  showIcebergs = true,
  showIcebergDrift = false,
  showRiskZones = true,
  showBathymetry = false,
  showSarQuicklook = false,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-16 right-4 z-20 pointer-events-auto">
      <div className="glass-panel p-3 rounded-xl border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md shadow-2xl min-w-[200px] max-w-[240px]">
        <div className="flex justify-between items-center pb-1.5 border-b border-[#3c494e]/40 mb-2">
          <span className="font-bold text-[11px] text-[#00daf3] tracking-widest uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">map</span>
            MAP LEGEND
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-[#bbc9cf] hover:text-white text-xs cursor-pointer p-0.5"
            title={collapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-2 text-xs font-sans">
            {/* Recommended Route — now colored by real per-segment risk */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-1.5 rounded shadow-[0_0_6px_rgba(255,255,255,0.4)]" style={{ background: 'linear-gradient(to right, #39ff14, #ffcc00, #ff8800, #ff3333)' }} />
              <span className="text-white text-[11px]">Route (colored by real segment risk)</span>
            </div>

            {/* Vessel Position */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#003543] border-2 border-[#00daf3] shadow-[0_0_8px_#00daf3]" />
              <span className="text-white text-[11px]">MV Vessel Position</span>
            </div>

            {/* Waypoints & Origin/Dest */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]" title="Origin" />
                <span className="w-2 h-2 rounded-full bg-[#00daf3]" title="Waypoint" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff3333]" title="Destination" />
              </div>
              <span className="text-white text-[11px]">Origin (Grn) / WP / Dest (Red)</span>
            </div>

            {/* High Risk Zone */}
            {showRiskZones && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-[#ff3333]/40 border border-dashed border-[#ff3333] flex items-center justify-center text-[7px]">
                  ⚠️
                </div>
                <span className="text-[#ffb4ab] text-[11px]">High Risk Zone (SIC &ge; 80%)</span>
              </div>
            )}

            {/* Iceberg Anomaly */}
            {showIcebergs && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ffaa00] border border-white flex items-center justify-center text-[8px] font-bold text-black shadow-[0_0_6px_#ffaa00]">
                    🧊
                  </div>
                  <span className="text-[#ffc107] text-[11px]">Iceberg Cluster (Model 2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-dashed border-[#ffaa00] bg-[#ffaa00]/15" />
                  <span className="text-[#bbc9cf] text-[11px]">Drift Confidence Radius (fades w/ day)</span>
                </div>
                {showIcebergDrift && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#0ea5e9] border border-white" />
                      <span className="text-[#7dd3fc] text-[11px]">Last Known Position (real track)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-[#7dd3fc]" style={{ position: 'relative' }}>
                        <span className="absolute -right-1 -top-1.5 text-[#7dd3fc] text-[10px]">➤</span>
                      </div>
                      <span className="text-[#7dd3fc] text-[11px]">Real Drift Vector (to selected day)</span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* SAR Quicklook Overlay */}
            {showSarQuicklook && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 rounded bg-gradient-to-r from-[#39ff14]/20 to-[#39ff14]/80 border border-[#39ff14]/50" />
                <span className="text-[#39ff14] text-[11px]">Real Sentinel-1 SAR Quicklook</span>
              </div>
            )}

            {/* Sea Ice Layer — LOW -> MODERATE -> HIGH real concentration scale */}
            {showSeaIce && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 rounded bg-gradient-to-r from-sky-400/30 via-amber-300/40 to-[#ff3333]/70" />
                <span className="text-[#bbc9cf] text-[11px]">Sea-Ice: Low → Moderate → High (Model 1)</span>
              </div>
            )}

            {/* Bathymetry Layer */}
            {showBathymetry && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 rounded bg-gradient-to-r from-[#0ea5e9]/70 to-[#0c4a6e]" />
                <span className="text-[#7dd3fc] text-[11px]">Ocean Depth (GEBCO)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
