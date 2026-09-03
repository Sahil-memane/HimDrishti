import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../../store/useStore';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { email, role, logout } = useAuthStore();
  const { alerts } = useAlertStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unackAlerts = alerts.filter((a) => !a.acknowledged).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/setup', label: 'Plan Voyage', icon: 'explore' },
    { to: '/forecast', label: 'Forecast', icon: 'weather_mix' },
    { to: '/alerts', label: 'Alerts', icon: 'warning', badge: unackAlerts },
    { to: '/analytics', label: 'Route Analysis', icon: 'analytics' },
  ];

  return (
    <div className="bg-[#071420] text-[#d7e4f5] font-sans min-h-screen flex overflow-hidden">
      {/* Side Navigation Bar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#14212d]/90 backdrop-blur-2xl border-r border-[#3c494e]/40 z-50 flex-col py-4 px-3 shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-[#3c494e]/30">
          <div className="h-10 w-10 rounded-lg bg-[#aee9ff]/10 border border-[#aee9ff]/30 flex items-center justify-center text-[#aee9ff] flex-shrink-0 shadow-[0_0_12px_rgba(174,233,255,0.2)]">
            <span className="material-symbols-outlined text-[24px]">explore</span>
          </div>
          <div>
            <h1 className="font-['Manrope'] font-bold text-xl text-[#aee9ff] tracking-tight leading-tight">
              HimDrishti
            </h1>
            <p className="font-mono text-[10px] text-[#bbc9cf] uppercase tracking-widest">
              Antarctic Command
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#249bcb] text-white shadow-[0_0_12px_rgba(36,155,203,0.4)]'
                    : 'text-[#bbc9cf] hover:text-white hover:bg-[#1f2b38]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="uppercase tracking-wider">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffb4ab] text-[#690005]">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* User Operator Profile */}
        <div className="mt-auto pt-4 border-t border-[#3c494e]/30 flex items-center justify-between px-2 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-[#35d4ff]/20 border border-[#35d4ff]/40 flex items-center justify-center text-[#35d4ff] font-bold text-xs flex-shrink-0">
              {email ? email.charAt(0).toUpperCase() : 'OP'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-[#d7e4f5] truncate font-bold">
                {email || 'Operator'}
              </p>
              <p className="font-mono text-[9px] text-[#bbc9cf] uppercase truncate">
                Role: {role || 'planner'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-[#bbc9cf] hover:text-[#ffb4ab] transition-colors p-1.5 rounded hover:bg-[#1f2b38] cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>

      {/* Top App Bar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-[#071420]/90 backdrop-blur-xl border-b border-[#3c494e]/40 z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#bbc9cf] hover:text-[#aee9ff]"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#101d29] border border-[#3c494e]/40">
            <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_8px_#39ff14]" />
            <span className="font-mono text-[10px] text-[#aee9ff] tracking-wider uppercase">
              SATCOM LIVE • UTC 14:32
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#bbc9cf]">
          <button
            onClick={() => navigate('/setup')}
            className="hidden sm:flex items-center gap-2 bg-[#aee9ff] text-[#003543] font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#35d4ff] transition-all uppercase tracking-wider cursor-pointer shadow-[0_0_12px_rgba(174,233,255,0.2)]"
          >
            <span className="material-symbols-outlined text-[16px]">explore</span>
            Plan Voyage
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="relative hover:text-[#aee9ff] transition-colors p-1.5 rounded-lg border border-[#3c494e]/40 bg-[#101d29]"
            title="System Alerts"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unackAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#ffb4ab] rounded-full border-2 border-[#071420] animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-64 pt-16 min-h-screen w-full relative">
        <Outlet />
      </main>
    </div>
  );
};
