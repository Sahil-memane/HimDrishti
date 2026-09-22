import React, { useState, useEffect, useRef } from 'react';
import { useForecastStore, useVoyageStore } from '../store/useStore';
import { InteractivePolarMap } from '../components/map/InteractivePolarMap';
import type { MapWaypoint } from '../components/map/InteractivePolarMap';
import { ForecastTrendChart } from '../components/forecast/ForecastTrendChart';
import { api, type ForecastSummary } from '../services/api';

const fmtPct = (v: number | null | undefined, digits = 1) => (v != null ? `${v.toFixed(digits)}%` : 'N/A');
const fmtTimestamp = (iso: string | null | undefined) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
};

export const ForecastPage: React.FC = () => {
  const { horizonDay, setHorizonDay } = useForecastStore();
  const { routeData, activeVoyageId } = useVoyageStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const [showSic, setShowSic] = useState(true);
  const [showIcebergs, setShowIcebergs] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showBathymetry, setShowBathymetry] = useState(false);

  // Real GeoJSON the map just fetched for the selected day (see
  // onForecastLoaded below) — used for the per-iceberg breakdown list.
  const [icebergGeoJSON, setIcebergGeoJSON] = useState<any>(null);

  // Real per-day aggregates from GET /forecast/summary (Model 1 + Model 2
  // output only). Kept even if a later fetch fails, so a transient network
  // problem doesn't wipe out the last genuinely successful forecast.
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryFetchFailed, setSummaryFetchFailed] = useState(false);
  const lastGoodFetchAt = useRef<string | null>(null);

  const waypoints: MapWaypoint[] = routeData?.waypoints || [];

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    api.getForecastSummary(activeVoyageId).then((res) => {
      if (cancelled) return;
      setSummaryLoading(false);
      if (res) {
        setSummary(res);
        setSummaryFetchFailed(false);
        lastGoodFetchAt.current = new Date().toISOString();
      } else {
        // Fetch genuinely failed (network/gateway error) — keep whatever
        // summary we already have and flag it as stale rather than clearing
        // real data off the screen.
        setSummaryFetchFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeVoyageId]);

  const handleForecastLoaded = (_seaIce: any, icebergs: any) => {
    setIcebergGeoJSON(icebergs);
  };

  // Auto-play timeline interval — only steps through days the backend
  // actually has sea-ice data for, when that's known.
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      const available = summary?.sea_ice.available_days?.length ? summary.sea_ice.available_days : [1, 2, 3, 4, 5, 6, 7];
      interval = setInterval(() => {
        const idx = available.indexOf(horizonDay);
        const next = idx === -1 || idx === available.length - 1 ? available[0] : available[idx + 1];
        setHorizonDay(next);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, horizonDay, setHorizonDay, summary]);

  // --- Real values for the selected day, straight from backend aggregates ---
  const sicDayIdx = summary?.sea_ice.daily.findIndex((d) => d.day === horizonDay) ?? -1;
  const sicToday = sicDayIdx != null && sicDayIdx >= 0 ? summary!.sea_ice.daily[sicDayIdx] : null;
  const sicPrevDay = summary?.sea_ice.daily.find((d) => d.day === horizonDay - 1) || null;
  const sicChange = sicToday?.avg_concentration != null && sicPrevDay?.avg_concentration != null
    ? sicToday.avg_concentration - sicPrevDay.avg_concentration
    : null;

  const ibToday = summary?.icebergs.daily.find((d) => d.day === horizonDay) || null;

  const sicAvailable = summary?.sea_ice.available_days || [];
  const ibAvailable = summary?.icebergs.available_days || [];
  const horizonAvailable = sicAvailable.length > 0 ? sicAvailable : ibAvailable;

  const modelUsed = routeData?.data_provenance?.sic_model_used || null;
  const icebergFeatures: any[] = icebergGeoJSON?.features || [];

  // A genuine "no real Model 1 data for this voyage" state — distinct from
  // "still loading" and from "the fetch itself failed".
  const sicUnavailableForVoyage = !summaryLoading && summary != null && sicAvailable.length === 0;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#071420] font-sans">
      {/* Interactive GIS Satellite Map Layer — primary visual, forecast layers on top */}
      <InteractivePolarMap
        waypoints={waypoints}
        showSeaIce={showSic}
        showIcebergs={showIcebergs}
        showIcebergDrift
        showRiskZones={showRiskZones}
        showBathymetry={showBathymetry}
        horizonDay={horizonDay}
        voyageId={activeVoyageId}
        onForecastLoaded={handleForecastLoaded}
        onToggleSeaIce={(show) => setShowSic(show)}
        onToggleIcebergs={(show) => setShowIcebergs(show)}
        onToggleRiskZones={(show) => setShowRiskZones(show)}
        onToggleBathymetry={(show) => setShowBathymetry(show)}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top-left: minimal day chip — full detail lives in the drawer, not duplicated here */}
      <div className="absolute top-16 left-4 z-10 pointer-events-auto">
        <div className="glass-panel px-3 py-1.5 rounded-lg border border-[#00daf3]/30 bg-[#071420]/85 backdrop-blur-md shadow-xl flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              summaryFetchFailed && !summary ? 'bg-[#ff3333]' : sicUnavailableForVoyage ? 'bg-[#f59e0b]' : 'bg-[#39ff14] animate-pulse'
            }`}
          />
          <span className="font-mono text-[11px] font-bold text-white uppercase tracking-wide">Forecast — Day {horizonDay}</span>
        </div>
      </div>

      {/* Right-side scrollable forecast details drawer */}
      <div
        className={`absolute right-0 top-0 bottom-0 z-20 transition-transform duration-300 ${detailsOpen ? 'translate-x-0' : 'translate-x-[calc(100%-2.25rem)]'}`}
      >
        <div className="flex h-full">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-9 flex-shrink-0 bg-[#071420]/95 border-l border-y border-[#00daf3]/30 flex flex-col items-center pt-4 cursor-pointer hover:bg-[#0a1c2b] pointer-events-auto"
            title={detailsOpen ? 'Collapse forecast details' : 'Expand forecast details'}
          >
            <span className="material-symbols-outlined text-[#00daf3] text-[18px]">
              {detailsOpen ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>

          <div className="w-[360px] h-full bg-[#071420]/95 backdrop-blur-2xl border-l border-[#00daf3]/20 overflow-y-auto pointer-events-auto p-4 flex flex-col gap-5">
            {/* --- Status banners (loading / unavailable) --- */}
            {summaryLoading && (
              <div className="glass-panel rounded-lg border border-[#00daf3]/30 p-2.5 text-[11px] font-mono text-[#bbc9cf] animate-pulse">
                Loading forecast…
              </div>
            )}
            {summaryFetchFailed && !summary && !summaryLoading && (
              <div className="glass-panel rounded-lg border border-[#ff3333]/50 bg-[#1a0709]/60 p-2.5 flex flex-col gap-0.5">
                <span className="font-mono text-xs font-bold text-[#ffb4ab]">FORECAST DATA TEMPORARILY UNAVAILABLE</span>
                <span className="font-mono text-[9px] text-[#bbc9cf]">Live data source did not respond.</span>
              </div>
            )}
            {summaryFetchFailed && summary && (
              <div className="glass-panel rounded-lg border border-[#f59e0b]/40 bg-[#1a1206]/60 p-2 text-[9px] font-mono text-[#f59e0b]">
                Showing latest available forecast (fetch failed — last update {fmtTimestamp(lastGoodFetchAt.current)})
              </div>
            )}
            {sicUnavailableForVoyage && !summaryFetchFailed && (
              <div className="glass-panel rounded-lg border border-[#f59e0b]/40 bg-[#1a1206]/60 p-2.5 flex flex-col gap-0.5">
                <span className="font-mono text-xs font-bold text-[#ffb4ab]">ICE FORECAST UNAVAILABLE</span>
                <span className="font-mono text-[9px] text-[#bbc9cf]">NOAA satellite data provider did not respond when this voyage was planned.</span>
              </div>
            )}

            {/* --- 7-Day Timeline --- */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xs text-white tracking-wider uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#00daf3]">timeline</span>
                  7-Day Forecast Timeline
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00daf3]/10 border border-[#00daf3]/30 hover:bg-[#00daf3]/20 transition-all cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#39ff14] animate-ping' : 'bg-[#00daf3]'}`} />
                  <span className="font-mono text-[9px] text-[#00daf3] uppercase font-bold">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                value={horizonDay}
                onChange={(e) => setHorizonDay(parseInt(e.target.value))}
                className="w-full accent-[#00daf3] cursor-pointer"
              />
              <div className="flex justify-between w-full mt-1.5 px-0.5">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const hasData = horizonAvailable.length === 0 || horizonAvailable.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setHorizonDay(day)}
                      className={`flex flex-col items-center gap-0.5 ${hasData ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                      title={hasData ? undefined : 'No forecast data for this day'}
                    >
                      <span className={`w-1.5 h-2.5 rounded-full transition-all ${horizonDay === day ? 'bg-[#00daf3] h-3.5' : 'bg-[#3c494e]'}`} />
                      <span className={`font-mono text-[8px] font-bold ${horizonDay === day ? 'text-[#00daf3]' : 'text-[#bbc9cf]'}`}>D{day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- Summary Cards --- */}
            <div>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00daf3]">dashboard</span>
                Forecast Summary — Day {horizonDay}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard
                  label="Sea-Ice Concentration"
                  value={sicToday?.avg_concentration != null ? fmtPct(sicToday.avg_concentration) : 'N/A'}
                  sub={sicChange != null ? `${sicChange > 0 ? '+' : ''}${sicChange.toFixed(1)}pp vs prior day` : undefined}
                  accent="#00daf3"
                />
                <SummaryCard
                  label="Iceberg Detections"
                  value={ibToday != null ? String(ibToday.count) : 'N/A'}
                  sub="Model 2 tracked objects"
                  accent="#ffaa00"
                />
                <SummaryCard
                  label="Iceberg Drift"
                  value={ibToday?.avg_drift_km_per_day != null ? `${ibToday.avg_drift_km_per_day.toFixed(1)} km/day` : 'N/A'}
                  sub="Avg. speed, Model 2"
                  accent="#7dd3fc"
                />
                <SummaryCard
                  label="Forecast Confidence"
                  value={sicToday?.avg_confidence != null ? `${(sicToday.avg_confidence * 100).toFixed(0)}%` : 'N/A'}
                  sub="Model 1 (sea-ice)"
                  accent="#39ff14"
                />
              </div>
              <div className="mt-2 glass-panel rounded-lg border border-[#3c494e]/40 p-2.5 flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#bbc9cf]">STATUS</span>
                <span className="text-white">
                  Day {horizonDay} of {horizonAvailable.length > 0 ? Math.max(...horizonAvailable) : 7}
                  {sicToday ? ` · ${fmtTimestamp(summary?.sea_ice.forecast_date ? `${summary.sea_ice.forecast_date}T00:00:00Z` : null)}` : ''}
                </span>
              </div>
            </div>

            {/* --- Model 1 Section --- */}
            <div>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-[#3c494e]/40 pb-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#38bdf8]">ac_unit</span>
                Sea-Ice Forecast — Model 1
              </h3>
              {sicToday ? (
                <div className="space-y-1.5 text-[11px] font-mono">
                  <Row label="Concentration" value={fmtPct(sicToday.avg_concentration)} />
                  <Row label="Model Confidence" value={sicToday.avg_confidence != null ? `${(sicToday.avg_confidence * 100).toFixed(1)}%` : 'N/A'} />
                  <Row label="Grid Cells Forecast" value={String(sicToday.cell_count)} />
                  <Row label="Classification" value={sicToday.avg_concentration == null ? 'N/A' : sicToday.avg_concentration >= 80 ? 'HIGH ICE' : sicToday.avg_concentration >= 30 ? 'MODERATE ICE' : 'LOW ICE'} />
                  {/* Real concentration scale legend */}
                  <div className="mt-2 h-2 rounded overflow-hidden flex">
                    <div className="flex-1 bg-sky-400/40" title="Low (0-30%)" />
                    <div className="flex-1 bg-amber-300/50" title="Moderate (30-65%)" />
                    <div className="flex-1 bg-orange-500/60" title="Approaching block (65-80%)" />
                    <div className="flex-1 bg-red-500/70" title="High / blocked (80%+)" />
                  </div>
                  <div className="flex justify-between text-[8px] text-[#6b7f8c]">
                    <span>LOW</span>
                    <span>MODERATE</span>
                    <span>HIGH</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-mono text-[#ffb4ab] italic">
                  Data unavailable — Model 1 did not produce a forecast for this voyage.
                </p>
              )}
            </div>

            {/* --- Model 2 Section --- */}
            <div>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-[#3c494e]/40 pb-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#ffaa00]">scatter_plot</span>
                Iceberg Forecast — Model 2
              </h3>
              {ibToday && ibToday.count > 0 ? (
                <div className="space-y-1.5 text-[11px] font-mono">
                  <Row label="Tracked Objects" value={String(ibToday.count)} />
                  <Row label="Avg. Confidence Radius" value={ibToday.avg_confidence_radius_km != null ? `±${ibToday.avg_confidence_radius_km.toFixed(1)} km` : 'N/A'} />
                  <Row label="Avg. Drift Speed" value={ibToday.avg_drift_km_per_day != null ? `${ibToday.avg_drift_km_per_day.toFixed(1)} km/day` : 'N/A'} />

                  {icebergFeatures.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <span className="text-[9px] text-[#6b7f8c] uppercase">Per-Iceberg Breakdown</span>
                      {icebergFeatures.map((f: any) => {
                        const p = f.properties || {};
                        return (
                          <div key={p.iceberg_id} className="bg-[#0e1c28] rounded p-1.5 flex flex-col gap-0.5">
                            <div className="flex justify-between">
                              <span className="text-[#ffaa00] font-bold">{p.iceberg_id}</span>
                              <span className="text-[#bbc9cf]">±{p.confidence_radius_km?.toFixed(1) ?? 'N/A'} km</span>
                            </div>
                            <div className="flex justify-between text-[#6b7f8c] text-[10px]">
                              <span>{p.drift_km_per_day != null ? `${p.drift_km_per_day.toFixed(1)} km/day` : 'N/A'}</span>
                              <span>{p.drift_bearing_deg != null ? `bearing ${p.drift_bearing_deg.toFixed(0)}°` : 'N/A'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] font-mono text-[#ffb4ab] italic">
                  Data unavailable — no tracked icebergs for this forecast.
                </p>
              )}
            </div>

            {/* --- Trend Charts --- */}
            <div>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-[#3c494e]/40 pb-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00daf3]">show_chart</span>
                Forecast Trends
              </h3>
              <div className="space-y-4">
                <ForecastTrendChart
                  title="Sea-Ice Concentration Trend"
                  unit="%"
                  color="#38bdf8"
                  points={[1, 2, 3, 4, 5, 6, 7].map((d) => ({
                    day: d,
                    value: summary?.sea_ice.daily.find((x) => x.day === d)?.avg_concentration ?? null,
                  }))}
                />
                <ForecastTrendChart
                  title="Iceberg Count Trend"
                  unit="objects"
                  color="#ffaa00"
                  points={[1, 2, 3, 4, 5, 6, 7].map((d) => ({
                    day: d,
                    value: summary?.icebergs.daily.find((x) => x.day === d)?.count ?? null,
                  }))}
                />
                <ForecastTrendChart
                  title="Iceberg Drift Trend"
                  unit="km/day"
                  color="#7dd3fc"
                  points={[1, 2, 3, 4, 5, 6, 7].map((d) => ({
                    day: d,
                    value: summary?.icebergs.daily.find((x) => x.day === d)?.avg_drift_km_per_day ?? null,
                  }))}
                />
              </div>
            </div>

            {/* --- Forecast Information --- */}
            <div>
              <h3 className="font-bold text-xs text-white tracking-wider uppercase mb-2 flex items-center gap-1.5 border-b border-[#3c494e]/40 pb-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#bbc9cf]">info</span>
                Forecast Information
              </h3>
              <div className="space-y-1.5 text-[11px] font-mono">
                <Row label="Model 1" value={modelUsed === 'lstm' ? 'Trained LSTM (primary)' : modelUsed === 'gbr' ? 'Gradient Boosting (fallback)' : 'N/A'} />
                <Row label="Model 1 Source" value="NOAA PolarWatch satellite SIC observations" small />
                <Row label="Model 2" value="Physics-informed drift model" />
                <Row label="Model 2 Source" value="Real Open-Meteo wind/current forecasts (tracked positions are demo-seeded in this environment)" small />
                <Row label="Sea-Ice Generated" value={fmtTimestamp(summary?.sea_ice.forecast_date ? `${summary.sea_ice.forecast_date}T00:00:00Z` : null)} />
                <Row label="Iceberg Forecast Generated" value={fmtTimestamp(summary?.icebergs.forecast_generated_at)} />
                <Row label="Forecast Horizon" value={sicAvailable.length > 0 ? `Day ${Math.min(...sicAvailable)}–${Math.max(...sicAvailable)}` : 'N/A'} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; accent: string }> = ({ label, value, sub, accent }) => (
  <div className="glass-panel rounded-lg border border-[#3c494e]/40 p-2.5 flex flex-col gap-0.5" style={{ borderLeftColor: accent, borderLeftWidth: 2 }}>
    <span className="text-[9px] font-bold text-[#bbc9cf] uppercase tracking-wide">{label}</span>
    <span className="text-base font-mono font-bold text-white">{value}</span>
    {sub && <span className="text-[9px] font-mono text-[#6b7f8c]">{sub}</span>}
  </div>
);

const Row: React.FC<{ label: string; value: string; small?: boolean }> = ({ label, value, small }) => (
  <div className="flex justify-between gap-3">
    <span className="text-[#6b7f8c] flex-shrink-0">{label}</span>
    <span className={`text-white text-right ${small ? 'text-[10px] leading-tight' : ''}`}>{value}</span>
  </div>
);
