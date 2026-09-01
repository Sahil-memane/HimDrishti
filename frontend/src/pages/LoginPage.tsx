import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/useStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'planner' | 'mariner'>('planner');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName) throw new Error('Please enter your full name');
        await api.register({ full_name: fullName, email, password, role });
        // Automatically login after successful registration
        const loginRes = await api.login({ email, password });
        setUser({
          userId: loginRes.user_id,
          email,
          role: loginRes.role,
          token: loginRes.access_token,
        });
        navigate('/setup');
      } else {
        const loginRes = await api.login({ email, password });
        setUser({
          userId: loginRes.user_id,
          email,
          role: loginRes.role,
          token: loginRes.access_token,
        });
        navigate('/setup');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDemo = async () => {
    try {
      const loginRes = await api.login({ email: 'planner@himdrishti.dev', password: 'Password123!' });
      setUser({
        userId: loginRes.user_id,
        email: loginRes.email,
        role: loginRes.role,
        token: loginRes.access_token,
      });
    } catch {
      const demoToken = 'demo_token_planner';
      localStorage.setItem('himdrishti_token', demoToken);
      setUser({
        userId: 'b0000000-0000-0000-0000-000000000001',
        email: 'planner@himdrishti.dev',
        role: 'planner',
        token: demoToken,
      });
    }
    navigate('/setup');
  };

  return (
    <div className="bg-[#051425] text-[#d5e3fc] min-h-screen relative overflow-hidden flex items-center justify-center font-sans">
      {/* Background Animated Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 animate-pulse"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAxo3mwCsojKoId00_tnKYOEInL63mdAUcQJqmCkc_pu2RHXK4HK8RqAGTOl2tBQJAURD_f-MXwY2tT-S6bHGSuL5PREzKqMD7D0exu5CxcunufmVc152TIu9q8xmRqVYEp9pnxYOpvsuxG_FH993gH6qNXx1tKnaiDX_ihPv2YmGIoOb3oioQIaGkoWQzcWnBwO22f8MvhgmUrDpRvvc_pEga8PMrTjVTNfgYmoDWtchOqwrdLGZe8')`
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#051425]/80 via-[#051425]/90 to-[#010f20] backdrop-blur-sm" />

      {/* Main Form Container */}
      <main className="relative z-10 w-full max-w-md px-6 py-8">
        <div className="glass-panel rounded-xl overflow-hidden shadow-2xl border border-white/20">
          {/* Header */}
          <div className="bg-white/5 p-6 text-center border-b border-white/10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(0,251,251,0.4)]" viewBox="0 0 100 100">
                <polygon fill="rgba(255,255,255,0.9)" points="50,15 25,75 75,75" />
                <polygon fill="rgba(0,251,251,0.6)" points="50,15 25,75 50,75" />
                <polygon fill="rgba(255,255,255,0.3)" points="50,15 75,75 50,75" />
                <polygon fill="rgba(0,221,221,0.4)" points="25,75 50,90 75,75" />
                <polygon fill="rgba(0,251,251,0.2)" points="25,75 50,90 50,75" />
              </svg>
              <h1 className="font-['Manrope'] font-bold text-2xl text-white tracking-tight">HimDrishti</h1>
            </div>
            <p className="font-mono text-xs text-[#b9cac9] uppercase tracking-widest mt-1">
              Authentication Gateway
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-[#1d2b3d] rounded-full border border-white/5">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                  mode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-[#b9cac9] hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                  mode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-[#b9cac9] hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="bg-[#93000a]/40 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs p-3 rounded font-mono">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Registration Specific Fields */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block font-mono text-xs text-[#839493] mb-1">Full Name</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[#b9cac9] text-sm">person</span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full bg-[#051425]/60 border-b-2 border-white/20 pl-10 pr-3 py-2 text-white font-mono text-sm focus:border-[#00dddd] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-[#839493] mb-1">Role Designation</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[#b9cac9] text-sm">badge</span>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'planner' | 'mariner')}
                        className="w-full bg-[#051425]/60 border-b-2 border-white/20 pl-10 pr-3 py-2 text-white font-mono text-sm focus:border-[#00dddd] focus:outline-none"
                      >
                        <option value="planner">Strategic Planner</option>
                        <option value="mariner">Field Mariner</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block font-mono text-xs text-[#839493] mb-1">Secure Email</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#b9cac9] text-sm">mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="planner@himdrishti.dev"
                    className="w-full bg-[#051425]/60 border-b-2 border-white/20 pl-10 pr-3 py-2 text-white font-mono text-sm focus:border-[#00dddd] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-[#839493] mb-1">Access Key</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#b9cac9] text-sm">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#051425]/60 border-b-2 border-white/20 pl-10 pr-10 py-2 text-white font-mono text-sm focus:border-[#00dddd] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#b9cac9] hover:text-white"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00fbfb] to-[#00dddd] hover:from-[#35d4ff] hover:to-[#00fbfb] text-[#002020] font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-[0_4px_15px_rgba(0,221,221,0.3)] transition-all"
              >
                <span>{loading ? 'Processing...' : mode === 'register' ? 'Request Access' : 'Initiate Uplink'}</span>
                <span className="material-symbols-outlined text-sm">
                  {mode === 'register' ? 'person_add' : 'login'}
                </span>
              </button>
            </form>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleSkipDemo}
                className="font-mono text-xs text-[#00dddd] hover:underline cursor-pointer"
              >
                Skip to Demo (Bypass Auth) →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
