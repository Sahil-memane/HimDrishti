import React from 'react';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import CTASection from '../components/landing/CTASection';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <CTASection />
    </div>
  );
};

export default LandingPage;

