import React, { useState, useEffect } from 'react';
import { useForecastStore, useVoyageStore } from '../store/useStore';
import { InteractivePolarMap } from '../components/map/InteractivePolarMap';
import type { MapWaypoint } from '../components/map/InteractivePolarMap';

export const ForecastPage: React.FC = () => {
  const { horizonDay, setHorizonDay } = useForecastStore();
  const { routeData } = useVoyageStore();
  const [isPlaying, setIsPlaying] = useState(false);

  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);

  // Predictive confidence linear decay calculation (94.2% -> 42.8%)
  const startConf = 94.2;
  const endConf = 42.8;
  const confidence = (startConf - ((startConf - endConf) / 6) * (horizonDay - 1)).toFixed(1);

  // Waypoints directly from store routeData
  const waypoints: MapWaypoint[] = routeData?.waypoints || [];

  // Auto-play timeline interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setHorizonDay(horizonDay >= 7 ? 1 : horizonDay + 1);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, horizonDay, setHorizonDay]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420] font-sans">
      {/* Interactive GIS Satellite Map Layer */}
      <InteractivePolarMap
        waypoints={waypoints}
        showSeaIce={showSic}
        showIcebergs={showIcebergs}
        showRiskZones={showRiskZones}
        onToggleSeaIce={(show) => setShowSic(show)}
        onToggleIcebergs={(show) => setShowIcebergs(show)}
        onToggleRiskZones={(show) => setShowRiskZones(show)}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top Floating Sector Readout */}
      <div className="absolute top-16 left-4 z-10 pointer-events-auto">
        <div className="glass-panel p-3.5 rounded-xl border border-[#00daf3]/30 bg-[#071420]/85 backdrop-blur-md flex flex-col gap-1 shadow-xl">
          <span className="text-[11px] font-bold text-[#00daf3] tracking-wider uppercase">
            SECTOR 7G ANALYSIS — DAY {horizonDay}
          </span>
          <span className="font-mono text-lg text-white font-bold">
            ICE_DENSITY: {(70.2 + horizonDay * 2.4).toFixed(1)}%
          </span>
          <span className="font-mono text-[10px] text-[#ffb4ab] flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            PREDICTED DRIFT CORRIDOR
          </span>
        </div>
      </div>

      {/* Forecast Control Panel (Bottom) */}
      <div className="absolute bottom-4 left-4 md:left-1/2 md:-translate-x-1/2 w-full max-w-xl px-4 z-10 pointer-events-auto">
        <div className="bg-[#071420]/90 backdrop-blur-2xl border border-[#00daf3]/30 rounded-xl shadow-2xl p-4 flex flex-col gap-4">
          {/* Panel Header */}
          <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00daf3] text-[18px]">timeline</span>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase">
                7-DAY PREDICTIVE FORECAST TIMELINE
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-[#bbc9cf] uppercase">
                  CONFIDENCE
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    Number(confidence) > 80
                      ? 'text-[#00daf3]'
                      : Number(confidence) > 60
                      ? 'text-[#b3c6db]'
                      : 'text-[#ffb4ab]'
                  }`}
                >
                  {confidence}%
                </span>
              </div>

              <div className="w-px h-6 bg-[#3c494e]/40" />

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00daf3]/10 border border-[#00daf3]/30 hover:bg-[#00daf3]/20 transition-all cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-[#39ff14] animate-ping' : 'bg-[#00daf3]'
                  }`}
                />
                <span className="font-mono text-[10px] text-[#00daf3] uppercase font-bold">
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </span>
              </button>
            </div>
          </div>

          {/* Slider Controls */}
          <div className="w-full">
            <input
              type="range"
              min="1"
              max="7"
              value={horizonDay}
              onChange={(e) => setHorizonDay(parseInt(e.target.value))}
              className="w-full accent-[#00daf3] cursor-pointer"
            />

            {/* Timeline Day Markers */}
            <div className="flex justify-between w-full mt-2 px-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setHorizonDay(day)}
                  className="flex flex-col items-center gap-0.5 cursor-pointer group"
                >
                  <span
                    className={`w-1.5 h-2.5 rounded-full transition-all ${
                      horizonDay === day ? 'bg-[#00daf3] h-3.5' : 'bg-[#3c494e]'
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] font-bold ${
                      horizonDay === day ? 'text-[#00daf3]' : 'text-[#bbc9cf]'
                    }`}
                  >
                    DAY {day}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
