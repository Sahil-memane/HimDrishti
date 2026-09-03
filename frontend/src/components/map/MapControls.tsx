import React, { useState } from 'react';
import type { TileStyleType } from './mapConfig';

interface MapControlsProps {
  activeTileType: TileStyleType;
  onTileTypeChange: (type: TileStyleType) => void;
  isGlobe: boolean;
  onToggleGlobe: () => void;
  onResetAntarctica: () => void;
  onFitRoute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showSeaIce?: boolean;
  onToggleSeaIce?: (show: boolean) => void;
  showIcebergs?: boolean;
  onToggleIcebergs?: (show: boolean) => void;
  showRiskZones?: boolean;
  onToggleRiskZones?: (show: boolean) => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  activeTileType,
  onTileTypeChange,
  isGlobe,
  onToggleGlobe,
  onResetAntarctica,
  onFitRoute,
  onZoomIn,
  onZoomOut,
  showSeaIce,
  onToggleSeaIce,
  showIcebergs,
  onToggleIcebergs,
  showRiskZones,
  onToggleRiskZones,
}) => {
  const [layersOpen, setLayersOpen] = useState(false);

  const hasLayerControls = onToggleSeaIce || onToggleIcebergs || onToggleRiskZones;

  return (
    <>
      {/* Primary Top-Left Map Control Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto max-w-[calc(100%-6rem)]">
        {/* Tile Layer Switcher */}
        <div className="glass-panel p-1 rounded-lg border border-[#00daf3]/30 flex items-center bg-[#071420]/90 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={() => onTileTypeChange('satellite')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTileType === 'satellite'
                ? 'bg-[#00daf3] text-[#002020] shadow-[0_0_8px_rgba(0,218,243,0.5)]'
                : 'text-[#bbc9cf] hover:text-white'
            }`}
            title="Satellite Basemap"
          >
            <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
            <span className="hidden sm:inline">SATELLITE</span>
          </button>

          <button
            type="button"
            onClick={() => onTileTypeChange('carto-dark')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTileType === 'carto-dark'
                ? 'bg-[#00daf3] text-[#002020] shadow-[0_0_8px_rgba(0,218,243,0.5)]'
                : 'text-[#bbc9cf] hover:text-white'
            }`}
            title="Tactical Dark Basemap"
          >
            <span className="material-symbols-outlined text-[14px]">dark_mode</span>
            <span className="hidden sm:inline">DARK</span>
          </button>

          <button
            type="button"
            onClick={() => onTileTypeChange('carto-voyager')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTileType === 'carto-voyager'
                ? 'bg-[#00daf3] text-[#002020] shadow-[0_0_8px_rgba(0,218,243,0.5)]'
                : 'text-[#bbc9cf] hover:text-white'
            }`}
            title="Voyager Basemap"
          >
            <span className="material-symbols-outlined text-[14px]">explore</span>
            <span className="hidden sm:inline">VOYAGER</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="glass-panel p-1 rounded-lg border border-[#00daf3]/30 flex items-center gap-1 bg-[#071420]/90 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={onResetAntarctica}
            className="px-2.5 py-1 rounded text-xs font-mono font-bold text-[#00daf3] hover:bg-[#00daf3]/20 transition-all flex items-center gap-1 cursor-pointer"
            title="Reset Antarctic View"
          >
            <span className="material-symbols-outlined text-[14px]">public</span>
            <span className="hidden md:inline">ANTARCTICA</span>
          </button>

          <button
            type="button"
            onClick={onFitRoute}
            className="px-2.5 py-1 rounded text-xs font-mono font-bold text-[#00daf3] hover:bg-[#00daf3]/20 transition-all flex items-center gap-1 cursor-pointer"
            title="Fit Route Bounds"
          >
            <span className="material-symbols-outlined text-[14px]">center_focus_strong</span>
            <span className="hidden md:inline">FIT ROUTE</span>
          </button>

          <button
            type="button"
            onClick={onToggleGlobe}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
              isGlobe ? 'text-[#39ff14]' : 'text-[#bbc9cf] hover:text-white'
            }`}
            title="Toggle 3D Globe Projection"
          >
            <span className="material-symbols-outlined text-[14px]">language</span>
            <span>{isGlobe ? '3D' : '2D'}</span>
          </button>
        </div>

        {/* Integrated Layers Dropdown Menu */}
        {hasLayerControls && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersOpen(!layersOpen)}
              className={`glass-panel px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-xl ${
                layersOpen
                  ? 'border-[#00daf3] bg-[#00daf3]/20 text-white'
                  : 'border-[#00daf3]/30 bg-[#071420]/90 text-[#00daf3] hover:bg-[#00daf3]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">layers</span>
              <span>LAYERS</span>
              <span className="text-[10px]">{layersOpen ? '▲' : '▼'}</span>
            </button>

            {layersOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 glass-panel p-3 rounded-xl border border-[#00daf3]/40 bg-[#071420]/95 backdrop-blur-xl shadow-2xl z-30 flex flex-col gap-2.5">
                <div className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-wider pb-1 border-b border-[#3c494e]/40">
                  Map Overlays
                </div>

                {onToggleSeaIce && (
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold hover:text-[#00daf3] transition-colors">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00daf3]" />
                      Sea-Ice (SIC)
                    </span>
                    <input
                      type="checkbox"
                      checked={showSeaIce}
                      onChange={(e) => onToggleSeaIce(e.target.checked)}
                      className="rounded text-[#00daf3] focus:ring-0 cursor-pointer accent-[#00daf3]"
                    />
                  </label>
                )}

                {onToggleIcebergs && (
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold hover:text-[#00daf3] transition-colors">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ffaa00]" />
                      Icebergs
                    </span>
                    <input
                      type="checkbox"
                      checked={showIcebergs}
                      onChange={(e) => onToggleIcebergs(e.target.checked)}
                      className="rounded text-[#00daf3] focus:ring-0 cursor-pointer accent-[#00daf3]"
                    />
                  </label>
                )}

                {onToggleRiskZones && (
                  <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#ffb4ab] hover:text-white transition-colors">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff3333]" />
                      Risk Zones
                    </span>
                    <input
                      type="checkbox"
                      checked={showRiskZones}
                      onChange={(e) => onToggleRiskZones(e.target.checked)}
                      className="rounded text-[#ffb4ab] focus:ring-0 cursor-pointer accent-[#ff3333]"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top-Right Compact Zoom Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 pointer-events-auto">
        <div className="glass-panel p-1 rounded-lg border border-[#00daf3]/30 bg-[#071420]/90 backdrop-blur-md shadow-xl flex items-center">
          <button
            type="button"
            onClick={onZoomIn}
            className="w-7 h-7 rounded text-[#00daf3] hover:bg-[#00daf3]/20 font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-all"
            title="Zoom In"
          >
            +
          </button>
          <div className="w-px h-4 bg-[#3c494e]/40" />
          <button
            type="button"
            onClick={onZoomOut}
            className="w-7 h-7 rounded text-[#00daf3] hover:bg-[#00daf3]/20 font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-all"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </>
  );
};
