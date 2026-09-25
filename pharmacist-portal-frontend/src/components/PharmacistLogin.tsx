import React, { useState } from 'react';
import { Pharmacist } from '../types';
import { INITIAL_PHARMACISTS } from '../data/mockDispensaryData';

interface PharmacistLoginProps {
  onLoginSuccess: (pharmacist: Pharmacist) => void;
  onExploreDemo: () => void;
}

export const PharmacistLogin: React.FC<PharmacistLoginProps> = ({
  onLoginSuccess,
  onExploreDemo,
}) => {
  const [selectedPharmacist, setSelectedPharmacist] = useState<Pharmacist>(INITIAL_PHARMACISTS[0]);
  const [pharmacistId, setPharmacistId] = useState('RX-78044-KLEIN');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [securityOverrideCode, setSecurityOverrideCode] = useState('');
  const [overrideMessage, setOverrideMessage] = useState('');

  const handleSelectPreset = (p: Pharmacist) => {
    setSelectedPharmacist(p);
    setPharmacistId(p.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthStatusMessage('Verifying biometrics and credentials...');

    setTimeout(() => {
      setAuthStatusMessage('Hardware token verified. Redirecting to dispensing bay...');
      setTimeout(() => {
        setAuthStatusMessage('ACCESS GRANTED: Station synchronized.');
        setTimeout(() => {
          setIsAuthenticating(false);
          onLoginSuccess(selectedPharmacist);
        }, 500);
      }, 600);
    }, 700);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 px-4 sm:px-8 bg-[#F5F0E1]">
      <div className="w-full max-w-[1240px] mx-auto flex flex-col items-center justify-between">
        {/* Top Context Subheader */}
        <div className="w-full flex items-center justify-between pb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F5D3F] flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[22px]">local_pharmacy</span>
            </div>
            <div className="flex flex-col tracking-tight text-left">
              <span className="font-serif text-xl sm:text-2xl text-[#2F5D3F] font-bold leading-none tracking-wide">
                SMART PHARMACY
              </span>
              <span className="font-sans text-[#1F2F4F]/70 font-semibold tracking-widest text-[11px] uppercase mt-1">
                Smart Pharmacy DISPENSARY
              </span>
            </div>
          </div>

          {/* Right: Protocol Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-full border border-[#E5DFCE] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#2F5D3F] animate-pulse"></span>
              <span className="text-[11px] font-semibold text-[#1F2F4F] uppercase tracking-wider">
                HS-256 Encrypted
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full shadow-xs border border-[#E5DFCE]">
              <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">lock</span>
              <span className="text-[11px] font-semibold text-[#1F2F4F]">
                Secure Verification
              </span>
            </div>
          </div>
        </div>

        {/* Central Card with Soft Glow */}
        <div className="w-full flex items-center justify-center py-4 relative">
          {/* Subtle Ambient Pink/Green Glow */}
          <div className="absolute w-[440px] h-[440px] bg-[#E9B8C4]/25 rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* Pharmacist Master Login Card */}
          <div className="w-full max-w-[460px] bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-[#E5DFCE] flex flex-col relative">
            {/* Top Status Accent Pill */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9B8C4] text-[#1F2F4F] text-[11px] font-bold tracking-wide">
                <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
                Clinical Station Auth
              </span>
              <span className="text-[11px] text-[#1F2F4F]/60 font-medium font-mono">
                v2.4 STITCH
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div className="flex flex-col mb-6 text-left">
              <h1 className="font-serif text-3xl sm:text-[34px] font-bold text-[#2F5D3F] tracking-tight leading-tight">
                Pharmacist Login
              </h1>
              <p className="text-sm text-[#1F2F4F]/80 mt-1 font-normal">
                Secure access to the pharmacy dispensing system
              </p>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              {/* Pharmacist ID Field */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2F4F]" htmlFor="pharmacistId">
                  <span className="material-symbols-outlined text-[17px] text-[#2F5D3F]">badge</span>
                  Pharmacist ID
                </label>
                <div className="relative flex items-center">
                  <input
                    id="pharmacistId"
                    type="text"
                    required
                    value={pharmacistId}
                    onChange={(e) => setPharmacistId(e.target.value)}
                    placeholder="e.g. RX-78044-KLEIN"
                    className="w-full h-11 px-3.5 bg-[#FAF7EE] text-[#1F2F4F] text-sm rounded-xl border border-[#E5DFCE] focus:bg-white focus:border-[#2F5D3F] focus:ring-2 focus:ring-[#2F5D3F]/15 focus:outline-none transition-all font-mono"
                  />
                  <span className="absolute right-3 text-[#2F5D3F] flex items-center pointer-events-none" title="Verified Pharmacist Credential">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2F4F]" htmlFor="authPassword">
                  <span className="material-symbols-outlined text-[17px] text-[#2F5D3F]">key</span>
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="authPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter station password"
                    className="w-full h-11 pl-3.5 pr-10 bg-[#FAF7EE] text-[#1F2F4F] text-sm rounded-xl border border-[#E5DFCE] focus:bg-white focus:border-[#2F5D3F] focus:ring-2 focus:ring-[#2F5D3F]/15 focus:outline-none transition-all tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-[#1F2F4F]/60 hover:text-[#2F5D3F] transition-colors rounded"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Utility Bar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#FAF7EE] text-[#2F5D3F] border-[#DDD5C0] accent-[#2F5D3F] cursor-pointer"
                  />
                  <span className="text-xs text-[#1F2F4F] font-medium">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[#2F5D3F] font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Station Terminal Ribbon */}
              <div className="bg-[#FAF7EE] px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-[#E5DFCE]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">cell_tower</span>
                  <span className="text-xs text-[#1F2F4F] font-mono">
                    Station Terminal: <strong className="text-[#2F5D3F]">DISP-BAY-03</strong>
                  </span>
                </div>
                <span className="text-[10px] text-[#2F5D3F] font-bold tracking-wider uppercase bg-[#2F5D3F]/10 px-2 py-0.5 rounded-full">
                  ONLINE
                </span>
              </div>

              {/* Primary Login Button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-11 bg-[#2F5D3F] text-white hover:bg-[#234730] active:scale-[0.99] text-sm uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 font-semibold mt-1 disabled:opacity-80 cursor-pointer"
              >
                <span>{isAuthenticating ? 'AUTHENTICATING...' : 'LOGIN'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              {/* Explore Demo */}
              <div className="w-full flex justify-center mt-2">
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1F2F4F]/80 hover:text-[#2F5D3F] font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                  Explore Demo (Instant Access)
                </button>
              </div>
            </form>

            {/* Dynamic Status Toast */}
            {authStatusMessage && (
              <div className="mt-4 p-3 bg-[#FAF7EE] border border-[#2F5D3F]/30 rounded-xl flex items-center gap-2 text-[#2F5D3F] text-xs transition-all animate-fade-in">
                <span className="material-symbols-outlined text-[18px] text-[#2F5D3F] animate-spin">
                  sync
                </span>
                <span className="font-semibold">{authStatusMessage}</span>
              </div>
            )}

            {/* Demo Quick Account Switcher */}
            <div className="mt-6 pt-4 border-t border-[#E5DFCE] text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1F2F4F]/60 block mb-2">
                Quick Select Pharmacist Profile (Demo Station)
              </span>
              <div className="flex flex-col gap-1.5">
                {INITIAL_PHARMACISTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all border ${
                      selectedPharmacist.id === p.id
                        ? 'bg-[#E9B8C4]/30 border-[#2F5D3F] text-[#1F2F4F] font-semibold'
                        : 'bg-[#FAF7EE]/70 hover:bg-[#FAF7EE] border-transparent text-[#1F2F4F]/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#E9B8C4] text-[#1F2F4F] flex items-center justify-center font-bold text-[10px]">
                        {p.avatarInitials}
                      </span>
                      <span>{p.name.split(',')[0]}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#2F5D3F]">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Footer Marker */}
        <div className="w-full text-center pt-6">
          <p className="text-xs text-[#1F2F4F]/70 tracking-wide flex items-center justify-center gap-2 flex-wrap">
            <span>Authorized pharmacist access only</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9B8C4]"></span>
            <span>Smart Pharmacy DISPENSARY • 21 CFR Part 11</span>
          </p>
        </div>
      </div>

      {/* Forgot Password / Station Unlock Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-[#E5DFCE]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
                  lock_reset
                </span>
                <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                  Pharmacist Station Recovery
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setOverrideMessage('');
                }}
                className="w-8 h-8 rounded-xl hover:bg-[#FAF7EE] flex items-center justify-center text-[#1F2F4F]/60"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-[#1F2F4F] text-left">
              <p>
                In compliance with DEA EPCS regulations, pharmacist passwords cannot be reset via plain email. Please enter your State Pharmacist License Pin or use the Lead Pharmacist supervisor override token:
              </p>
              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] font-mono text-[11px]">
                Active Pharmacist: <strong>{selectedPharmacist.name}</strong><br/>
                License: <strong>{selectedPharmacist.licenseNumber}</strong><br/>
                Emergency Supervisor Key: <strong className="text-[#2F5D3F]">SMART-SEC-991</strong>
              </div>

              <div className="flex flex-col gap-1.5 pt-2">
                <label className="font-semibold text-[#1F2F4F]">Emergency Override Token:</label>
                <input
                  type="text"
                  value={securityOverrideCode}
                  onChange={(e) => setSecurityOverrideCode(e.target.value)}
                  placeholder="Enter SMART-SEC-991"
                  className="w-full h-10 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-sm font-mono focus:outline-none focus:border-[#2F5D3F]"
                />
              </div>

              {overrideMessage && (
                <p className="text-xs font-semibold text-[#2F5D3F] bg-[#2F5D3F]/10 p-2.5 rounded-xl">
                  {overrideMessage}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5DFCE] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setOverrideMessage('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#1F2F4F] hover:bg-[#FAF7EE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (securityOverrideCode.trim().toUpperCase() === 'SMART-SEC-991' || securityOverrideCode.length > 0) {
                    setOverrideMessage('Biometric override accepted. Station access restored.');
                    setTimeout(() => {
                      setPassword('••••••••••••');
                      setShowForgotModal(false);
                      setOverrideMessage('');
                    }, 1000);
                  } else {
                    setOverrideMessage('Please enter emergency key SMART-SEC-991');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730]"
              >
                Authenticate Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
