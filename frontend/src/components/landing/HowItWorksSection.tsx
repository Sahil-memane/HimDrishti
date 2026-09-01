import React from 'react';

const HowItWorksSection: React.FC = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen relative overflow-hidden font-sans">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 z-0">
        <img 
          alt="Background" 
          className="w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9blEsMqmCKaEdH8teR-y4SXHYO6I3gzqFxzGMDorSLLm1HTNtVIP4Gi6ZKFThX6rQox5ynTYCjwvwHIjV9tsUgB4Xto9-DGxYV-PKPO2LLxFIw7I5WzfkKRO5LAHDWBJNZKj4H12iTz1Ja4wkyN2FYAcrJHnDr9-ImEEkbllg_-hfb1UwTcEp7ZxqSr2eIAVzzKLehOltlfe2oYRl30hIRxABjwCs3Jt7cMjVaG86g6JsHLTh6WIr-A"
        />
      </div>
      
      {/* Subtle Top Gradient Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-transparent h-48"></div>
      
      {/* Content Overlay */}
      <div className="relative z-10 container mx-auto px-6 lg:px-12 h-screen flex flex-col">
        {/* BEGIN: MainContent */}
        <main className="flex-grow flex items-center justify-end">
          
          {/* Left Area (Visuals - Simulated) */}
          <div className="absolute left-1/4 bottom-1/4">
            <div className="text-3xl font-bold glow-text font-mono">A*</div>
          </div>
          
          {/* Right Area (Cards) */}
          <div className="w-full max-w-md flex flex-col space-y-6 pt-12 pb-24 mr-0 lg:mr-12 xl:mr-24">
            
            {/* Card 1 */}
            <div className="glass-card rounded-2xl p-6 flex items-start gap-6 transition duration-300 hover:bg-white/20">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg border border-white/30 bg-white/5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">1. Input Voyage Parameters</h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Define start/end points, cargo type, and vessel constraints for optimal route calculation.
                </p>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="glass-card rounded-2xl p-6 flex items-start gap-6 transition duration-300 hover:bg-white/20">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg border border-white/30 bg-white/5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">2. Hazard Synthesis</h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Real-time data fusion from satellites and sensors to map ice concentration and risks.
                </p>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="glass-card rounded-2xl p-6 flex items-start gap-6 transition duration-300 hover:bg-white/20">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg border border-white/30 bg-white/5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">3. Collision-Free Route</h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  AI-powered pathfinding generates the safest, most fuel-efficient passage through complex environments.
                </p>
              </div>
            </div>
            
            {/* Call to Action */}
            <div className="pt-4 flex justify-center">
              <button className="bg-gray-100 hover:bg-white text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 text-sm tracking-wide">
                GET STARTED
              </button>
            </div>
            
          </div>
        </main>
        {/* END: MainContent */}
      </div>
    </div>
  );
};

export default HowItWorksSection;
