import React, { useState } from 'react';

interface MapLegendProps {
  showSeaIce?: boolean;
  showIcebergs?: boolean;
  showRiskZones?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showSeaIce = true,
  showIcebergs = true,
  showRiskZones = true,
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
            {/* Recommended Route */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-[#ffffff] border-t border-b border-[#00daf3] shadow-[0_0_6px_#00daf3]" />
              <span className="text-white text-[11px]">Recommended Path</span>
            </div>

            {/* Active Vessel */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#003543] border-2 border-[#00daf3] flex items-center justify-center shadow-[0_0_8px_#00daf3]" />
              <span className="text-white text-[11px]">MV Vessel Position</span>
            </div>

            {/* Waypoints */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#00daf3]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff3333]" />
              </div>
              <span className="text-white text-[11px]">Origin / Waypoint / Dest</span>
            </div>

            {/* Risk Zones */}
            {showRiskZones && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-[#ff3333]/30 border border-dashed border-[#ff3333]" />
                <span className="text-[#ffb4ab] text-[11px]">High Risk Zone (SIC &gt; 85%)</span>
              </div>
            )}

            {/* Iceberg Anomaly */}
            {showIcebergs && (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#ffaa00] border border-white flex items-center justify-center text-[8px] font-bold text-black shadow-[0_0_6px_#ffaa00]">
                  🧊
                </div>
                <span className="text-[#ffc107] text-[11px]">Iceberg Anomaly & Cluster</span>
              </div>
            )}

            {/* Sea Ice Layer */}
            {showSeaIce && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 rounded bg-gradient-to-r from-[#00daf3]/20 via-[#00daf3]/60 to-[#ffffff]" />
                <span className="text-[#bbc9cf] text-[11px]">Sea-Ice Concentration</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
