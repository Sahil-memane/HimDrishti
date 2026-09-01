import React from 'react';

interface LandingPageVariant1Props {
  onPlanVoyage?: () => void;
  onExploreIntelligence?: () => void;
  onSignIn?: () => void;
  onSwitchVariant?: () => void;
}

export const LandingPageVariant1: React.FC<LandingPageVariant1Props> = ({
  onPlanVoyage,
  onExploreIntelligence,
  onSignIn,
  onSwitchVariant,
}) => {
  return (
    <div className="bg-[#071420] text-[#d7e4f5] min-h-screen font-sans overflow-x-hidden relative">
      {/* Background Shader & Radial Gradient */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#003549]/30 via-[#071420] to-[#030f1b] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 border-[#3c494e]/30 h-20 flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onSwitchVariant}>
          <div className="h-10 w-10 rounded-lg bg-[#aee9ff]/10 border border-[#aee9ff]/30 flex items-center justify-center text-[#aee9ff]">
            <span className="material-symbols-outlined text-[24px]">explore</span>
          </div>
          <span className="font-[#Manrope] font-bold text-2xl text-[#aee9ff] hidden sm:block tracking-tight">
            HimDrishti
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs tracking-widest font-bold text-[#bbc9cf] uppercase">
          <button onClick={onSignIn} className="hover:text-[#aee9ff] transition-colors cursor-pointer uppercase">
            SIGN IN
          </button>
          <button onClick={onPlanVoyage} className="hover:text-[#aee9ff] transition-colors cursor-pointer uppercase">
            VOYAGE SETUP
          </button>
          <button onClick={onExploreIntelligence} className="hover:text-[#aee9ff] transition-colors cursor-pointer uppercase">
            DASHBOARD
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onSignIn}
            className="hidden sm:block text-xs font-bold tracking-widest text-[#bbc9cf] hover:text-[#aee9ff] transition-colors px-4 py-2 uppercase"
          >
            SIGN IN
          </button>
          <button
            onClick={onPlanVoyage}
            className="bg-[#aee9ff] text-[#003543] font-bold text-xs tracking-widest px-6 py-2.5 rounded hover:bg-[#35d4ff] transition-all glow-active flex items-center gap-2 uppercase cursor-pointer"
          >
            PLAN VOYAGE
            <span className="material-symbols-outlined text-[18px]">explore</span>
          </button>
          {onSwitchVariant && (
            <button
              onClick={onSwitchVariant}
              title="Switch UI Variant"
              className="glass-panel text-[#aee9ff] text-xs px-3 py-1.5 rounded border border-[#aee9ff]/30 hover:bg-[#aee9ff]/10 transition-all uppercase"
            >
              3D Scene UI
            </button>
          )}
        </div>
      </nav>

      {/* Main Hero Content */}
      <main className="relative z-10 pt-32 pb-24 px-6 md:px-10 min-h-screen flex flex-col justify-center max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline & Controls */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 w-fit border-[#aee9ff]/30">
              <span className="w-2 h-2 rounded-full bg-[#aee9ff] animate-pulse shadow-[0_0_8px_#aee9ff]" />
              <span className="font-mono text-[#aee9ff] text-xs uppercase tracking-wider">
                System Online • Active Monitoring
              </span>
            </div>

            <h1 className="font-['Manrope'] font-bold text-4xl md:text-6xl md:leading-[1.1] text-white">
              Navigate Beyond the <span className="text-[#aee9ff] text-glow">Horizon.</span>
            </h1>

            <p className="text-lg text-[#bbc9cf] max-w-xl font-normal leading-relaxed">
              AI-powered Antarctic maritime intelligence for safer, smarter and more efficient voyages in the world's most hostile environment.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onPlanVoyage}
                className="bg-[#aee9ff] text-[#003543] font-bold text-xs tracking-widest px-8 py-4 rounded hover:bg-[#35d4ff] transition-all glow-active flex items-center gap-2 uppercase cursor-pointer"
              >
                PLAN A VOYAGE
                <span className="material-symbols-outlined text-[20px]">sailing</span>
              </button>
              <button
                onClick={onExploreIntelligence}
                className="glass-panel border-[#aee9ff]/50 text-[#aee9ff] font-bold text-xs tracking-widest px-8 py-4 rounded hover:bg-[#1f2b38] transition-all flex items-center gap-2 uppercase cursor-pointer"
              >
                EXPLORE INTELLIGENCE
                <span className="material-symbols-outlined text-[20px]">analytics</span>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-6 mt-4 border-t border-[#3c494e]/30">
              <div>
                <div className="text-xs font-bold tracking-widest text-[#bbc9cf] mb-1 uppercase">
                  ACTIVE VESSELS
                </div>
                <div className="font-mono text-[#aee9ff] text-2xl font-bold">042</div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest text-[#bbc9cf] mb-1 uppercase">
                  ICE ALERTS (24H)
                </div>
                <div className="font-mono text-[#ffb4ab] text-2xl font-bold">18</div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest text-[#bbc9cf] mb-1 uppercase">
                  COVERAGE
                </div>
                <div className="font-mono text-white text-2xl font-bold">99.8%</div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization Radar / Map */}
          <div className="lg:col-span-6 mt-8 lg:mt-0 relative h-[450px] lg:h-[550px] glass-panel rounded-xl overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1f2b38]/40 via-[#071420]/80 to-[#071420] z-0" />
            
            <div className="relative z-10 w-full h-full rounded-lg border border-[#3c494e]/30 bg-[#101d29]/50 overflow-hidden group">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-screen transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAl4UtB-R1I1wbw6oXJ9n3agZV1iZS1ao3n0AEOuIwnYyM4-8rMxkQIg7ulI30_xtj1lJTOB22fmJpzcCJe_xFabRq4X1LKF0tu5g2IxmAOVRbg31LB3z6QyBO34EfgQ-ld9iiIiAM-gd_Hz8T1MSf1gboYq1FPJdVYxwRkf1LN-xpwKLpGnkv9wHURPodUg2pJZoW2Xubx5M-9MUS-brkgt4SxtHfEKElgYUX9tCZ24ZxegZx8a7fZ')`
                }}
              />
              
              {/* Radar Sweep Effect */}
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(174,233,255,0.25)_0deg,transparent_60deg,transparent_360deg)] animate-spin opacity-50" style={{ animationDuration: '10s' }} />

              {/* Overlay UI elements on the map */}
              <div className="absolute top-4 left-4 glass-panel px-3 py-2 rounded flex flex-col gap-1 border-[#aee9ff]/30">
                <span className="text-[10px] font-bold tracking-widest text-[#bbc9cf] uppercase">
                  ROUTE OPTIMIZATION
                </span>
                <span className="font-mono text-[#aee9ff] text-sm flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">route</span>
                  ALPHA-7
                </span>
              </div>

              <div className="absolute bottom-4 right-4 glass-panel px-3 py-2 rounded flex items-center gap-3 border-[#aee9ff]/30">
                <span className="w-2 h-2 rounded-full bg-[#35d4ff] animate-ping" />
                <span className="font-mono text-xs text-[#aee9ff]">LIVE RADAR FEED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Capabilities Section */}
        <div className="mt-28">
          <h2 className="font-['Manrope'] font-bold text-3xl text-white mb-10 text-center">
            Core Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="glass-panel p-6 rounded-lg flex flex-col gap-4 hover:border-[#aee9ff]/50 transition-all group cursor-pointer">
              <div className="h-12 w-12 rounded bg-[#293643] flex items-center justify-center text-[#aee9ff] group-hover:bg-[#aee9ff]/10 transition-colors">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  weather_snowy
                </span>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-semibold text-lg text-white mb-2">
                  Sea Ice Forecasting
                </h3>
                <p className="text-sm text-[#bbc9cf] leading-relaxed">
                  Predictive models utilizing satellite SAR data for 72-hour ice drift projection.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-6 rounded-lg flex flex-col gap-4 hover:border-[#aee9ff]/50 transition-all group cursor-pointer">
              <div className="h-12 w-12 rounded bg-[#293643] flex items-center justify-center text-[#aee9ff] group-hover:bg-[#aee9ff]/10 transition-colors">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  landscape
                </span>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-semibold text-lg text-white mb-2">
                  Iceberg Intelligence
                </h3>
                <p className="text-sm text-[#bbc9cf] leading-relaxed">
                  Automated detection and tracking of calved mass with collision probability matrix.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-6 rounded-lg flex flex-col gap-4 hover:border-[#aee9ff]/50 transition-all group cursor-pointer">
              <div className="h-12 w-12 rounded bg-[#293643] flex items-center justify-center text-[#aee9ff] group-hover:bg-[#aee9ff]/10 transition-colors">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  alt_route
                </span>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-semibold text-lg text-white mb-2">
                  Smart Routing
                </h3>
                <p className="text-sm text-[#bbc9cf] leading-relaxed">
                  Dynamic waypoint generation optimized for fuel efficiency and structural safety.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="glass-panel p-6 rounded-lg flex flex-col gap-4 hover:border-[#aee9ff]/50 transition-all group cursor-pointer">
              <div className="h-12 w-12 rounded bg-[#293643] flex items-center justify-center text-[#aee9ff] group-hover:bg-[#aee9ff]/10 transition-colors">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-semibold text-lg text-white mb-2">
                  Live Risk Monitoring
                </h3>
                <p className="text-sm text-[#bbc9cf] leading-relaxed">
                  Real-time telemetry overlay with severity indexing for immediate bridge alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
