import React, { useEffect, useState } from 'react';
import { ThreePolarScene } from '../components/landing/ThreePolarScene';

interface LandingPageVariant2Props {
  onDeployDashboard?: () => void;
  onRequestAccess?: () => void;
  onSwitchVariant?: () => void;
  onSignIn?: () => void;
  onFleet?: () => void;
  onRoutes?: () => void;
  onIntelligence?: () => void;
  onLogistics?: () => void;
}

export const LandingPageVariant2: React.FC<LandingPageVariant2Props> = ({
  onDeployDashboard,
  onRequestAccess,
  onSwitchVariant,
  onSignIn,
  onFleet,
  onRoutes,
  onIntelligence,
  onLogistics,
}) => {
  const handleSignIn = onRequestAccess || onSignIn;
  const [nmCount, setNmCount] = useState(0);
  const [avoidanceCount, setAvoidanceCount] = useState(0);
  const [fuelCount, setFuelCount] = useState(0);

  useEffect(() => {
    // Intersection Observer for .fade-up elements
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // Trigger counters if this is the KPI section
          if (entry.target.id === 'kpi-section') {
            animateCounters();
          }

          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    // Scroll progress line for Navigational Sequence
    const handleScroll = () => {
      const section = document.getElementById('nav-sequence-section');
      const line = document.getElementById('progress-line');
      if (!section || !line) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight && rect.bottom > 0) {
        let progress = 1 - rect.bottom / (windowHeight + rect.height);
        progress = Math.max(0, Math.min(1, progress * 1.5));
        line.style.width = `${progress * 100}%`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const animateCounters = () => {
    let start = 0;
    const duration = 2000;
    const steps = 60;
    const intervalTime = duration / steps;

    const timer = setInterval(() => {
      start += 1;
      const progress = start / steps;

      setNmCount(Math.ceil(progress * 50));
      setAvoidanceCount(Math.min(99, Math.ceil(progress * 99)));
      setFuelCount(Math.min(18, Math.ceil(progress * 18)));

      if (start >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);
  };

  return (
    <div className="min-h-screen text-[#e3e1e8] relative antialiased font-sans selection:bg-[#00daf3]/30 selection:text-[#00daf3]">
      {/* 1:1 Three.js 3D Polar Ocean & Ship Navigation Background */}
      <ThreePolarScene />

      {/* Navigation Header Overlay */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-20 bg-[#121318]/50 backdrop-blur-xl border-b border-white/5 transition-transform duration-200">
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onSwitchVariant}>
          <span
            className="material-symbols-outlined text-[#00daf3] text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            explore
          </span>
          <span className="font-['Montserrat'] font-bold text-2xl tracking-tighter text-[#00daf3] drop-shadow-[0_0_12px_rgba(0,218,243,0.5)]">
            HimDrishti
          </span>
        </div>

        {/* Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8 font-['Inter'] text-sm">
          <button
            onClick={onFleet}
            className="text-[#c5c5d2] font-medium hover:text-[#00daf3] transition-colors duration-300 cursor-pointer uppercase text-xs font-bold tracking-wider"
          >
            Fleet
          </button>
          <button
            onClick={onRoutes}
            className="text-[#c5c5d2] font-medium hover:text-[#00daf3] transition-colors duration-300 cursor-pointer uppercase text-xs font-bold tracking-wider"
          >
            Routes
          </button>
          <button
            onClick={onIntelligence}
            className="text-[#c5c5d2] font-medium hover:text-[#00daf3] transition-colors duration-300 cursor-pointer uppercase text-xs font-bold tracking-wider"
          >
            Intelligence
          </button>
          <button
            onClick={onLogistics}
            className="text-[#c5c5d2] font-medium hover:text-[#00daf3] transition-colors duration-300 cursor-pointer uppercase text-xs font-bold tracking-wider"
          >
            Logistics
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSignIn}
            className="hidden sm:block text-xs font-bold tracking-widest text-[#c5c5d2] hover:text-[#00daf3] transition-colors px-3 py-1.5 uppercase cursor-pointer"
          >
            SIGN IN
          </button>

          <button
            onClick={onDeployDashboard}
            className="hidden lg:flex items-center gap-2 bg-[#004f58] text-[#00daf3] font-bold text-sm px-4 py-2 rounded-xl shadow-[0_0_12px_rgba(0,218,243,0.3)] hover:bg-[#00daf3]/20 transition-colors cursor-pointer"
          >
            Plan Voyage
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          {onSwitchVariant && (
            <button
              onClick={onSwitchVariant}
              title="Switch UI Variant"
              className="glass-panel text-[#00daf3] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#00daf3]/30 hover:bg-[#00daf3]/10 transition-all uppercase cursor-pointer"
            >
              Minimal UI
            </button>
          )}

          <div className="flex gap-3 text-[#bec7d8]">
            <button onClick={handleSignIn} className="hover:text-[#00daf3] transition-colors cursor-pointer" title="Sign In">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 pt-20">
        {/* Section 1: Hero */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center relative py-20">
          <div className="max-w-4xl fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border-[#00daf3]/30 text-[#00daf3] text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-[#00daf3] shadow-[0_0_8px_#00daf3] animate-pulse" />
              Live Satellite Uplink Active
            </div>

            <h1 className="font-['Montserrat'] font-bold text-4xl sm:text-6xl text-[#e3e1e8] mb-6 leading-tight">
              Safer Polar Routes,
              <br />
              <span className="gradient-text-cyan glow-text">Smarter Navigation</span>
            </h1>

            <p className="font-['Inter'] text-lg text-[#c5c5d2] max-w-2xl mx-auto mb-10 leading-relaxed">
              HimDrishti is the world's most advanced polar route optimization platform, combining real-time satellite telemetry, ice drift forecasting, and AI-driven hazard synthesis for commercial fleets.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onDeployDashboard}
                className="bg-gradient-to-r from-[#00daf3] to-[#004f58] text-[#001f24] font-bold text-sm px-8 py-4 rounded-xl shadow-[0_0_15px_rgba(0,218,243,0.4)] hover:shadow-[0_0_25px_rgba(0,218,243,0.6)] transition-all transform hover:scale-105 w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2"
              >
                Plan Voyage
                <span className="material-symbols-outlined text-[18px]">explore</span>
              </button>
              <button
                onClick={handleSignIn}
                className="glass-panel border border-[#00daf3] text-[#00daf3] font-bold text-sm px-8 py-4 rounded-xl hover:bg-[#00daf3]/10 transition-all w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2"
              >
                Sign In / Register
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#bec7d8] opacity-70 animate-bounce">
            <span className="text-[11px] font-bold tracking-widest uppercase">
              Scroll to begin the voyage
            </span>
            <span className="material-symbols-outlined">expand_more</span>
          </div>
        </section>

        {/* Section 2: Navigational Sequence Checkpoint */}
        <section id="nav-sequence-section" className="py-32 relative">
          <div className="text-center mb-20 fade-up">
            <h2 className="font-['Montserrat'] font-bold text-3xl text-[#e3e1e8] mb-4">
              Navigational Sequence
            </h2>
            <p className="text-base text-[#c5c5d2] max-w-xl mx-auto">
              Real-time processing from global coordinate input to safe passage execution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-white/10 -z-10">
              <div
                className="h-full bg-[#00daf3] shadow-[0_0_10px_#00daf3] w-0 transition-all duration-1000"
                id="progress-line"
              />
            </div>

            {/* Step 1 */}
            <div className="glass-card p-8 rounded-xl flex flex-col items-center text-center fade-up">
              <div className="w-16 h-16 rounded-full bg-[#1f1f24] flex items-center justify-center border border-[#00daf3]/30 mb-6 shadow-[0_0_15px_rgba(0,218,243,0.2)]">
                <span className="material-symbols-outlined text-[#00daf3] text-3xl">route</span>
              </div>
              <h3 className="font-['Montserrat'] font-semibold text-xl text-[#e3e1e8] mb-3">
                Input Parameters
              </h3>
              <p className="text-sm text-[#c5c5d2] leading-relaxed">
                Define origin, destination, vessel class, and draft constraints into the global map interface.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-8 rounded-xl flex flex-col items-center text-center fade-up delay-100">
              <div className="w-16 h-16 rounded-full bg-[#1f1f24] flex items-center justify-center border border-[#00daf3]/30 mb-6 shadow-[0_0_15px_rgba(0,218,243,0.2)]">
                <span className="material-symbols-outlined text-[#ffb4ab] text-3xl">ac_unit</span>
              </div>
              <h3 className="font-['Montserrat'] font-semibold text-xl text-[#e3e1e8] mb-3">
                Hazard Synthesis
              </h3>
              <p className="text-sm text-[#c5c5d2] leading-relaxed">
                AI correlates satellite feeds, live ice reports, and weather patterns to map dense iceberg clusters.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-8 rounded-xl flex flex-col items-center text-center fade-up delay-200">
              <div className="w-16 h-16 rounded-full bg-[#1f1f24] flex items-center justify-center border border-[#00daf3]/30 mb-6 shadow-[0_0_15px_rgba(0,218,243,0.2)]">
                <span className="material-symbols-outlined text-[#b7c4ff] text-3xl">turn_right</span>
              </div>
              <h3 className="font-['Montserrat'] font-semibold text-xl text-[#e3e1e8] mb-3">
                Collision-Free Route
              </h3>
              <p className="text-sm text-[#c5c5d2] leading-relaxed">
                Dynamic waypoint generation steers the fleet clear of danger zones while optimizing fuel burn.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Feature Suite (Bento Grid) */}
        <section className="py-32">
          <div className="mb-16 fade-up">
            <h2 className="font-['Montserrat'] font-bold text-3xl text-[#e3e1e8] mb-4">
              Everything Your Fleet Needs
            </h2>
            <p className="text-base text-[#c5c5d2] max-w-2xl">
              A comprehensive suite of operational tools designed for extreme maritime environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px]">
            {/* Feature 1 (Large) */}
            <div className="glass-card rounded-xl p-6 md:col-span-2 lg:col-span-2 md:row-span-2 flex flex-col justify-end relative overflow-hidden group fade-up">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e13] to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuC5IiA09Tke3Amp8QAX8W0N9D1AKTRfsCzLL1E1JbkiyaxDUwzEv-Ov70n9lTu1TQFCXeiHnpi6pHGwy55_6MslshUU4OqcWSNZdVznT4MGD9ArQBVpbOnjXIpaPcYPI98p52ZURo54Wp-h_H13wB6MLHccsPXEwtW8aV0R1_Wg5hk7sQnerJgesp4Rf2u6MjuIL0LA8kMqGo6iigmXPvLE0hbTTTfCUcBEWsSQPh2PiJojmjZQMcBExA')`,
                }}
              />
              <div className="relative z-20">
                <span className="material-symbols-outlined text-[#00daf3] text-3xl mb-2">
                  satellite_alt
                </span>
                <h3 className="font-['Montserrat'] font-bold text-xl text-[#e3e1e8] mb-2">
                  Real-Time Satellite Feed
                </h3>
                <p className="text-sm text-[#bec7d8]">
                  High-resolution multi-spectral imagery overlay for instant environmental awareness.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-xl p-6 flex flex-col relative overflow-hidden fade-up delay-100">
              <span className="material-symbols-outlined text-[#00daf3] text-3xl mb-auto">
                radar
              </span>
              <div>
                <h3 className="font-bold text-base text-[#e3e1e8] mb-1">Iceberg Detection</h3>
                <p className="text-xs text-[#bec7d8]">Automated tracking of floating anomalies.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-xl p-6 flex flex-col relative overflow-hidden fade-up delay-200">
              <span className="material-symbols-outlined text-[#00daf3] text-3xl mb-auto">
                speed
              </span>
              <div>
                <h3 className="font-bold text-base text-[#e3e1e8] mb-1">Fuel Optimization</h3>
                <p className="text-xs text-[#bec7d8]">Route mapping designed to minimize burn.</p>
              </div>
            </div>

            {/* Feature 4 (Wide) */}
            <div className="glass-card rounded-xl p-6 md:col-span-2 flex items-center justify-between overflow-hidden fade-up delay-300">
              <div className="max-w-[65%]">
                <span className="material-symbols-outlined text-[#00daf3] text-3xl mb-2">
                  warning
                </span>
                <h3 className="font-bold text-base text-[#e3e1e8] mb-1">
                  Predictive Hazard Alerts
                </h3>
                <p className="text-xs text-[#bec7d8]">
                  Early warning system for shifting ice floes and severe weather fronts.
                </p>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-[#ffb4ab] border-t-transparent animate-spin flex-shrink-0" />
            </div>

            {/* Feature 5 */}
            <div className="glass-card rounded-xl p-6 flex flex-col relative overflow-hidden fade-up delay-400">
              <span className="material-symbols-outlined text-[#00daf3] text-3xl mb-auto">
                history
              </span>
              <div>
                <h3 className="font-bold text-base text-[#e3e1e8] mb-1">Voyage Archives</h3>
                <p className="text-xs text-[#bec7d8]">Historical route playback and analysis.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Operational Impact (KPIs) */}
        <section id="kpi-section" className="py-32 border-t border-white/5 relative fade-up">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00daf3]/5 to-transparent opacity-50 pointer-events-none" />
          
          <div className="text-center mb-16">
            <h2 className="font-['Montserrat'] font-bold text-3xl text-[#e3e1e8]">
              Proven Operational Impact
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="p-6">
              <div className="font-['Montserrat'] font-bold text-5xl text-[#00daf3] glow-text mb-2">
                {nmCount}K+
              </div>
              <div className="text-xs font-bold text-[#e3e1e8] uppercase tracking-widest">
                Thousand NM Optimized
              </div>
            </div>

            <div className="p-6">
              <div className="font-['Montserrat'] font-bold text-5xl text-[#00daf3] glow-text mb-2">
                {avoidanceCount}.4%
              </div>
              <div className="text-xs font-bold text-[#e3e1e8] uppercase tracking-widest">
                Hazard Avoidance Rate
              </div>
            </div>

            <div className="p-6">
              <div className="font-['Montserrat'] font-bold text-5xl text-[#00daf3] glow-text mb-2">
                {fuelCount}.2%
              </div>
              <div className="text-xs font-bold text-[#e3e1e8] uppercase tracking-widest">
                Average Fuel Reduction
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full bg-[#0d0e13] py-12 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#bec7d8] text-[24px]">explore</span>
          <span className="font-bold text-sm text-[#bec7d8]">HimDrishti</span>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-[#bec7d8]">
          <a className="hover:text-[#00daf3] transition-colors" href="#security">
            Security Protocol
          </a>
          <a className="hover:text-[#00daf3] transition-colors" href="#registry">
            Icebreaker Registry
          </a>
          <a className="hover:text-[#00daf3] transition-colors" href="#terms">
            Terms of Engagement
          </a>
          <a className="hover:text-[#00daf3] transition-colors" href="#contact">
            Contact HQ
          </a>
        </div>

        <div className="text-xs text-[#bec7d8] opacity-80 text-center md:text-right">
          © 2026 HimDrishti Polar Intelligence. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};
