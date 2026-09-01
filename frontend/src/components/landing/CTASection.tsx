import React from 'react';

const CTASection: React.FC = () => {
  return (
    <div className="antialiased min-h-screen flex flex-col">
      {/* BEGIN: MainContent */}
      <main 
        className="flex-grow relative flex items-center justify-center bg-cover bg-center" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AEtjO1VEhMZf_Kua-fQ3BE9NS1AoRS73gwILvsuIiIaJcHBCmBM8R1imqwZgsPHaZ6EvdzDNKbNTcYN4JxFzdn_i0YwN0yaecO4GVrhT0a6tiufZCtujo1bL2izOnb8LUS_Dsmyn9E8Gic1-Q-G79N7WCyiUMPfMTGQ6CxQRLjvL2Qi1q29RLaLmZtogisj8saPIP2ShdNOXXx5O_5u5533o1R8mUHTDcEb1iMhzLPJB8KnO50uns6jwRCRHsFEd')", minHeight: "calc(100vh - 100px)" }}
      >
        {/* Dark overlay for better text readability if background is too bright */}
        <div className="absolute inset-0 bg-black/20 mix-blend-multiply pointer-events-none"></div>
        
        {/* Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-5xl mx-4 sm:mx-6 lg:mx-8 px-6 py-20 sm:py-32 rounded-3xl glass-panel text-center flex flex-col items-center justify-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-10 max-w-4xl drop-shadow-lg">
            Ready To Navigate Polar<br className="hidden sm:block"/> Extremes with Confidence?
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto justify-center">
            {/* Primary CTA */}
            <a href="#" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[#0a192f] transition-all duration-200 bg-[#25d3e2] border border-transparent rounded-lg hover:bg-[#1fb8c5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25d3e2]">
              Deploy Fleet Dashboard
            </a>
            {/* Secondary CTA */}
            <a href="#" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 bg-transparent border-white rounded-lg hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white border">
              Request Simulator Access
            </a>
          </div>
        </div>
      </main>
      {/* END: MainContent */}
      
      {/* BEGIN: Footer */}
      <footer className="bg-[#122238] py-8 w-full z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Logo Section */}
            <div className="flex items-center space-x-3">
              {/* Placeholder for Logo Icon */}
              <svg className="w-10 h-10 text-[#25d3e2]" fill="none" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" fillOpacity="0.2" d="M20 0L40 12V28L20 40L0 28V12L20 0Z"></path>
                <path fill="currentColor" fillOpacity="0.5" d="M20 5L35 14V26L20 35L5 26V14L20 5Z"></path>
                <path fill="currentColor" d="M20 10L30 16V24L20 30L10 24V16L20 10Z"></path>
              </svg>
              <span className="text-white text-2xl font-bold tracking-wide">HimDrishti</span>
            </div>
            {/* Navigation & Legal Section */}
            <div className="flex flex-col items-center md:items-end space-y-4">
              {/* Main Links */}
              <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm font-medium text-gray-300">
                <a href="#" className="hover:text-white transition-colors">Product</a>
                <a href="#" className="hover:text-white transition-colors">Technology</a>
                <a href="#" className="hover:text-white transition-colors">Solutions</a>
                <a href="#" className="hover:text-white transition-colors">About Us</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
                <a href="#" className="hover:text-white transition-colors">Careers</a>
              </nav>
              {/* Copyright & Legal */}
              <div className="text-xs text-gray-400 flex flex-wrap justify-center gap-x-3 gap-y-1">
                <span>© 2024 HimDrishti. All Rights Reserved.</span>
                <span className="hidden sm:inline">|</span>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <span className="hidden sm:inline">|</span>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* END: Footer */}
    </div>
  );
};

export default CTASection;
