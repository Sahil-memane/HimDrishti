import React, { useState, useEffect } from 'react';
import { useForecastStore } from '../store/useStore';

export const ForecastPage: React.FC = () => {
  const { horizonDay, setHorizonDay } = useForecastStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // Predictive confidence linear decay calculation (94.2% -> 42.8%)
  const startConf = 94.2;
  const endConf = 42.8;
  const confidence = (startConf - ((startConf - endConf) / 6) * (horizonDay - 1)).toFixed(1);

  // Auto-play timeline interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setHorizonDay(horizonDay >= 7 ? 1 : horizonDay + 1);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setHorizonDay, horizonDay]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420] font-sans">
      {/* Background Aerial Photo */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDF8N5xboyfeWugDvEU1IGb_SHR278G_9oangL3fXvqOIVF7Kpr27aO7j0yggjayKIiNP6ioNnQLOw9b-gY3bnTzhDfD9DYpH782JYLlK835La50t6kl_brsc4AlqUMz7E5tCm8QzzK62LpDrfjxbfCmkBgUNDS4k4yqmyT7dNhkAdL97evzPeBdakvI2_DFcE53ZNeeiXxRG4U3epb72k0ZGb94vDH_yvdlNOgOW6n7zBo6rmBVMzv')`
        }}
      />

      {/* Sector Readout */}
      <div className="absolute top-8 left-10 pointer-events-none hidden lg:block">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-[#aee9ff]/60 tracking-wider">
            SECTOR 7G ANALYSIS
          </span>
          <span className="font-mono text-xl text-white font-bold">ICE_DENSITY: 84.3%</span>
          <span className="font-mono text-xs text-[#ffb4ab] flex items-center gap-1.5 mt-1">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            FRACTURE DETECTED
          </span>
        </div>
      </div>

      {/* Map Marker Pin */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-[#aee9ff]/40 bg-[#aee9ff]/10 flex items-center justify-center relative animate-pulse">
          <span className="material-symbols-outlined text-[#aee9ff] text-[24px]">my_location</span>
        </div>
        <div className="mt-3 bg-[#14212d]/90 backdrop-blur-md border border-[#aee9ff]/30 px-3 py-2 rounded shadow-lg text-center">
          <p className="font-mono text-xs text-[#aee9ff]">LAT: 77°50'S | LON: 166°40'E</p>
          <p className="text-[10px] font-bold text-[#bbc9cf] uppercase">MCMURDO STATION PROXIMITY</p>
        </div>
      </div>

      {/* Forecast Control Panel (Bottom) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
        <div className="bg-[#14212d]/85 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-6 flex flex-col gap-6">
          {/* Panel Header */}
          <div className="flex justify-between items-center border-b border-[#3c494e]/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#aee9ff]">timeline</span>
              <h3 className="font-bold text-xs text-white tracking-widest uppercase">
                7-DAY FORECAST TIMELINE
              </h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#bbc9cf] uppercase">
                  PREDICTIVE CONFIDENCE
                </span>
                <span
                  className={`font-mono text-base font-bold ${
                    Number(confidence) > 80
                      ? 'text-[#aee9ff]'
                      : Number(confidence) > 60
                      ? 'text-[#b3c6db]'
                      : 'text-[#ffb4ab]'
                  }`}
                >
                  {confidence}%
                </span>
              </div>

              <div className="w-px h-8 bg-[#3c494e]/40" />

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#aee9ff]/10 border border-[#aee9ff]/30 hover:bg-[#aee9ff]/20 transition-all cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-[#39ff14] animate-ping' : 'bg-[#aee9ff]'
                  }`}
                />
                <span className="font-mono text-xs text-[#aee9ff] uppercase font-bold">
                  {isPlaying ? 'PAUSE' : 'AUTO-PLAY'}
                </span>
              </button>
            </div>
          </div>

          {/* Slider Controls */}
          <div className="py-2 w-full">
            <input
              type="range"
              min="1"
              max="7"
              value={horizonDay}
              onChange={(e) => setHorizonDay(parseInt(e.target.value))}
              className="w-full accent-[#49d6ff] cursor-pointer"
            />

            {/* Timeline Day Markers */}
            <div className="flex justify-between w-full mt-3 px-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setHorizonDay(day)}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <span
                    className={`w-1.5 h-3 rounded-full transition-all ${
                      horizonDay === day ? 'bg-[#aee9ff] h-4' : 'bg-[#3c494e]'
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      horizonDay === day ? 'text-[#aee9ff]' : 'text-[#bbc9cf]'
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
