import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <main 
      className="relative min-h-screen flex flex-col items-center justify-between bg-hero" 
      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDI_DrFBR8TVJkIKuroX47hWDi8kwuTE2PL2rZQnDK-RINZziwkAYiZH5A11GpSX4H7Gg3eTuWMtTszCNV_zuO7U1gqEir1Ik_E7SzEmC_g6Uj33LOPcns195IC5JsDl-OyFAv8lfgsok8iyB1ip6EcMqEFfF-ALuJ3MvofPdA51eaCsRjvZLo8HogEnyWhi9HGOXJRv0ZrCrGyggD82lq-ufYnLn6zHsFwHIKIvUjziexdNRxypnhsWQ')" }}
    >
      {/* Optional Overlay for better text readability if the real image is bright */}
      <div className="absolute inset-0 bg-black bg-opacity-20 z-0 pointer-events-none"></div>
      
      {/* BEGIN: Navigation Bar */}
      <header className="w-[95%] max-w-7xl mx-auto mt-6 rounded-full glass-nav px-8 py-4 flex items-center justify-between z-10 relative">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          {/* SVG Placeholder for Iceberg Logo */}
          <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2zm0 4.5l5.5 11H6.5L12 6.5z"></path>
          </svg>
          <span className="text-xl font-bold tracking-wide">HimDrishti</span>
        </div>
        
        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-200">
          <a href="#" className="hover:text-white transition-colors">AI Routing Engine</a>
          <a href="#" className="hover:text-white transition-colors">Platform</a>
          <a href="#" className="hover:text-white transition-colors">Technology</a>
          <a href="#" className="hover:text-white transition-colors">Our Fleet</a>
          <a href="#" className="hover:text-white transition-colors">News</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </nav>
        
        {/* Get Started Button */}
        <div>
          <a href="#" className="px-6 py-2 rounded-full border border-gray-400/50 hover:bg-white/10 transition-colors text-sm font-medium">
            Get Started
          </a>
        </div>
      </header>
      {/* END: Navigation Bar */}
      
      {/* BEGIN: Hero Content */}
      <section className="flex-grow flex flex-col items-center justify-center text-center z-10 relative px-4 w-full max-w-4xl mx-auto mt-16 md:mt-0">
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight text-white drop-shadow-lg">
          Safer Polar Routes,<br/>Smarter Navigation
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl drop-shadow-md">
          Navigate the future of maritime logistics with our advanced AI-powered polar routing platform.
        </p>
        <a href="#" className="px-8 py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold rounded-full text-lg transition-all transform hover:scale-105 glow-button inline-block">
          Launch Command Center
        </a>
      </section>
      {/* END: Hero Content */}
      
      {/* BEGIN: Scroll Indicator */}
      <div className="z-10 relative flex flex-col items-center pb-8 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
        <div className="w-10 h-10 rounded-full border border-white/50 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
        <span className="text-sm text-gray-300">Scroll to begin the voyage</span>
      </div>
      {/* END: Scroll Indicator */}
    </main>
  );
};

export default HeroSection;
