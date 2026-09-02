import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingPageVariant1 } from './LandingPageVariant1';
import { LandingPageVariant2 } from './LandingPageVariant2';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeVariant, setActiveVariant] = useState<'3d' | 'minimal'>('minimal');

  const handleToggleVariant = () => {
    setActiveVariant((prev) => (prev === '3d' ? 'minimal' : '3d'));
  };

  const handlePlanVoyage = () => {
    navigate('/setup');
  };

  const handleExploreIntelligence = () => {
    navigate('/dashboard');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleFleet = () => {
    navigate('/setup');
  };

  const handleRoutes = () => {
    navigate('/dashboard');
  };

  const handleIntelligence = () => {
    navigate('/forecast');
  };

  const handleLogistics = () => {
    navigate('/analytics');
  };

  if (activeVariant === '3d') {
    return (
      <LandingPageVariant2
        onDeployDashboard={handlePlanVoyage}
        onRequestAccess={handleSignIn}
        onSwitchVariant={handleToggleVariant}
        onSignIn={handleSignIn}
        onFleet={handleFleet}
        onRoutes={handleRoutes}
        onIntelligence={handleIntelligence}
        onLogistics={handleLogistics}
      />
    );
  }

  return (
    <LandingPageVariant1
      onPlanVoyage={handlePlanVoyage}
      onExploreIntelligence={handleExploreIntelligence}
      onSignIn={handleSignIn}
      onSwitchVariant={handleToggleVariant}
    />
  );
};

export default LandingPage;
