import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useVoyageStore } from '../store/useStore';

export const VoyageSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveVoyage, setRouteData, setLlmRecommendation } = useVoyageStore();

  const [vesselId, setVesselId] = useState('b0000000-0000-0000-0000-000000000001');
  const [startLat, setStartLat] = useState(-60.0);
  const [startLon, setStartLon] = useState(40.0);
  const [destLat, setDestLat] = useState(-77.846);
  const [destLon, setDestLon] = useState(166.6682);
  const [speedKnots, setSpeedKnots] = useState(12.5);
  const [fuelRate, setFuelRate] = useState(850);
  const [fuelCapacity, setFuelCapacity] = useState(500000);
  const [depTime, setDepTime] = useState(new Date().toISOString().slice(0, 16));
  const [riskProfile, setRiskProfile] = useState<'safest' | 'balanced' | 'efficient'>('balanced');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    setStatusMsg('COMPUTING ROUTE VIA A* ENGINE...');

    try {
      // 1. Create Voyage via API Gateway
      const res = await api.createVoyage({
        vessel_id: vesselId,
        start_lat: Number(startLat),
        start_lon: Number(startLon),
        dest_lat: Number(destLat),
        dest_lon: Number(destLon),
        departure_time: new Date(depTime).toISOString(),
        speed_knots: Number(speedKnots),
        fuel_consumption_lph: Number(fuelRate),
        risk_tolerance: riskProfile,
      });

      const voyageId = res.voyage_id;
      setActiveVoyage(voyageId, 'processing');

      // 2. Poll for computed route
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const route = await api.getRoute(voyageId);
          clearInterval(pollInterval);
          setRouteData(route);
          setActiveVoyage(voyageId, 'planned');

          // 3. Fetch Model 3 LLM Recommendation asynchronously
          const rec = await api.getRouteRecommendation(voyageId);
          if (rec && rec.recommendation) {
            setLlmRecommendation(rec.recommendation);
          } else {
            setLlmRecommendation(route.reasoning);
          }

          setLoading(false);
          navigate('/dashboard');
        } catch {
          if (attempts >= 10) {
            clearInterval(pollInterval);
            setLoading(false);
            setErrorMsg('Route computation timed out or destination unreachable.');
          }
        }
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to submit voyage');
    }
  };

  return (
    <div className="p-6 md:p-10 flex justify-center items-start min-h-screen">
      <div className="w-full max-w-5xl glass-panel rounded-xl relative overflow-hidden flex flex-col border border-[#aee9ff]/20 shadow-2xl">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-[#3c494e]/40 flex flex-col bg-[#14212d]/60">
          <h2 className="font-['Manrope'] font-bold text-2xl md:text-3xl text-white">
            Plan Your Antarctic Voyage
          </h2>
          <div className="flex items-center mt-2 gap-2">
            <span className="w-2 h-2 rounded-full bg-[#aee9ff] animate-pulse" />
            <p className="font-mono text-xs text-[#aee9ff] uppercase tracking-widest">
              INITIALIZE INTELLIGENT ROUTING PROTOCOL
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-6 bg-[#93000a]/40 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs p-3 rounded font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column: Vessel Telemetry */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#3c494e]/50">
                <span className="material-symbols-outlined text-[#bbc9cf] text-sm">
                  directions_boat
                </span>
                <h3 className="font-bold text-xs text-[#bbc9cf] tracking-widest uppercase">
                  VESSEL TELEMETRY
                </h3>
              </div>

              {/* Assigned Vessel */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#bbc9cf] uppercase block">
                  Assigned Vessel
                </label>
                <select
                  value={vesselId}
                  onChange={(e) => setVesselId(e.target.value)}
                  className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 px-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none"
                >
                  <option value="b0000000-0000-0000-0000-000000000001">MV Antarctic Explorer</option>
                  <option value="b0000000-0000-0000-0000-000000000002">RV Polar Research</option>
                </select>
              </div>

              {/* Origin Lat/Lon */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-[#bbc9cf] uppercase block">
                  Origin Coordinates (LAT / LON)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      min="-90"
                      max="90"
                      value={startLat}
                      onChange={(e) => setStartLat(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 pl-10 pr-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none"
                      placeholder="-60.0000"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-[#bbc9cf] text-[18px]">
                      find_replace
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      min="-180"
                      max="180"
                      value={startLon}
                      onChange={(e) => setStartLon(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 pl-10 pr-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none"
                      placeholder="40.0000"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-[#bbc9cf] text-[18px]">
                      public
                    </span>
                  </div>
                </div>
              </div>

              {/* Speed & Fuel Rate */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-[#bbc9cf] uppercase block mb-1">
                    Cruising Speed
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={speedKnots}
                      onChange={(e) => setSpeedKnots(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 px-4 font-mono text-sm pr-12 focus:border-[#aee9ff] focus:outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-[#bbc9cf]">
                      KTS
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#bbc9cf] uppercase block mb-1">
                    Fuel Consump. Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={fuelRate}
                      onChange={(e) => setFuelRate(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 px-4 font-mono text-sm pr-12 focus:border-[#aee9ff] focus:outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-[#bbc9cf]">
                      LPH
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Routing Parameters */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#3c494e]/50">
                <span className="material-symbols-outlined text-[#bbc9cf] text-sm">route</span>
                <h3 className="font-bold text-xs text-[#bbc9cf] tracking-widest uppercase">
                  ROUTING PARAMETERS
                </h3>
              </div>

              {/* Destination Lat/Lon */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#bbc9cf] uppercase block">
                  Destination Coordinates (LAT / LON)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      min="-90"
                      max="90"
                      value={destLat}
                      onChange={(e) => setDestLat(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 pl-10 pr-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none"
                      placeholder="-77.8460"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-[#bbc9cf] text-[18px]">
                      my_location
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      min="-180"
                      max="180"
                      value={destLon}
                      onChange={(e) => setDestLon(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 pl-10 pr-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none"
                      placeholder="166.6682"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-[#bbc9cf] text-[18px]">
                      location_searching
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Fuel Capacity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#bbc9cf] uppercase block">
                    Fuel Capacity
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={fuelCapacity}
                      onChange={(e) => setFuelCapacity(parseFloat(e.target.value))}
                      className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-3 px-4 font-mono text-sm pr-8 focus:border-[#aee9ff] focus:outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-[#bbc9cf]">
                      L
                    </span>
                  </div>
                </div>

                {/* Departure Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#bbc9cf] uppercase block">
                    Departure (UTC)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    className="w-full bg-[#040C14] border border-[#3c494e] text-white rounded-lg py-[11px] px-4 font-mono text-sm focus:border-[#aee9ff] focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Risk Profile Selection */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-[#bbc9cf] uppercase block mb-2">
                  Risk Preference Profile
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['safest', 'balanced', 'efficient'] as const).map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => setRiskProfile(profile)}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        riskProfile === profile
                          ? 'border-[#aee9ff] bg-[#aee9ff]/10 text-[#aee9ff] shadow-[0_0_12px_rgba(174,233,255,0.2)]'
                          : 'border-[#3c494e] hover:bg-[#1f2b38] text-[#bbc9cf]'
                      }`}
                    >
                      <span className="material-symbols-outlined mb-1 text-[20px]">
                        {profile === 'safest' ? 'shield' : profile === 'balanced' ? 'balance' : 'speed'}
                      </span>
                      <span className="font-bold text-[10px] uppercase">{profile}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-[#3c494e]/40 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#aee9ff] hover:bg-[#35d4ff] text-[#003543] font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(174,233,255,0.3)] hover:shadow-[0_0_25px_rgba(174,233,255,0.5)] cursor-pointer"
            >
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'sync' : 'route'}
              </span>
              <span>{loading ? statusMsg : 'GENERATE INTELLIGENT ROUTE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
