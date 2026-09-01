import React from 'react';
import { useAlertStore, useForecastStore } from '../store/useStore';
import { api } from '../services/api';

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert } = useAlertStore();
  const { horizonDay, setHorizonDay } = useForecastStore();

  const handleAck = async (id: string) => {
    try {
      await api.acknowledgeAlert(id);
    } catch {
      // Fall back to state update
    }
    acknowledgeAlert(id);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#030b17] font-sans">
      {/* Background Satellite Photo */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBPUK4Q2W43emUzMGhjoRv5Xu7lpG4NuPj_dB0rJg4DL5g6WWndVu1BAOpdxVWenKGR3HbW-GpGMbzB1X7OnQE-1Yi6FjJZSKc7MPXuo18g7N6rpvTUhZCsUaXrVtydwVqEoke2TzQvXQA2sVjZmNVxjeJ5joLP8r_lQ-LDaeGnnn2S1EKPeeDd6qaacAUVrEmMJvfOg2ShoZWVCeVOOlTg4e2M6QwE_5sUtfZvZMC6ESJbT5uvKi7M')`
        }}
      />

      {/* Main Container / Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[440px] bg-[#081C2C]/90 backdrop-blur-2xl border-l border-[#aee9ff]/20 shadow-2xl flex flex-col z-20">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#3c494e]/40 flex items-center justify-between">
          <div>
            <h3 className="font-['Manrope'] font-bold text-xl text-white">Live Diagnostics</h3>
            <p className="font-mono text-xs text-[#bbc9cf] mt-0.5">SYS_MONITOR_ACTIVE</p>
          </div>
          <div className="flex items-center gap-2 bg-[#040C14] px-3 py-1.5 rounded-full border border-[#aee9ff]/30 shadow-[0_0_8px_rgba(174,233,255,0.3)]">
            <span className="w-2 h-2 rounded-full bg-[#aee9ff] animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-[#aee9ff]">STREAMING</span>
          </div>
        </div>

        {/* Alert Cards Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alerts.map((item) => (
            <div
              key={item.alert_id}
              className={`p-4 rounded-lg border relative overflow-hidden transition-all duration-300 ${
                item.acknowledged
                  ? 'bg-[#14212d]/40 border-[#3c494e]/30 opacity-60 grayscale'
                  : item.severity === 'high'
                  ? 'bg-[#14212d]/80 border-[#f43f5e]/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#14212d]/80 border-[#f59e0b]/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              }`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  item.severity === 'high' ? 'bg-[#f43f5e]' : 'bg-[#f59e0b]'
                }`}
              />

              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      item.severity === 'high' ? 'text-[#f43f5e]' : 'text-[#f59e0b]'
                    }`}
                  >
                    {item.severity === 'high' ? 'warning' : 'error'}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold uppercase ${
                      item.severity === 'high' ? 'text-[#f43f5e]' : 'text-[#f59e0b]'
                    }`}
                  >
                    {item.severity === 'high' ? 'CRITICAL ANOMALY' : 'WARNING'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#bbc9cf]">
                  {item.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE'}
                </span>
              </div>

              <h4 className="font-bold text-sm text-white mb-1">{item.alert_type.toUpperCase()}</h4>
              <p className="font-mono text-xs text-[#bbc9cf] mb-3 leading-relaxed">{item.message}</p>

              {!item.acknowledged && (
                <div className="flex justify-end">
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
          ))}
        </div>

        {/* Drawer Footer Slider */}
        <div className="p-6 border-t border-[#3c494e]/40 bg-[#040C14]/60">
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
