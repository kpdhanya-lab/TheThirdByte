import React, { useState, useEffect } from 'react';
import { Pharmacist } from '../types';
import {
  authenticatePharmacist,
  fetchActiveHospitalCodes,
  findHospitalByCode,
  INITIAL_HOSPITAL_CODES,
} from '../utils/supabase';

interface PharmacistLoginProps {
  onLoginSuccess: (pharmacist: Pharmacist) => void;
  onExploreDemo: () => void;
}

export const PharmacistLogin: React.FC<PharmacistLoginProps> = ({
  onLoginSuccess,
  onExploreDemo,
}) => {
  const [hospitalCode, setHospitalCode] = useState('560017');
  const [hospitalList, setHospitalList] = useState(INITIAL_HOSPITAL_CODES);
  const [pharmacistId, setPharmacistId] = useState('PH-1001');
  const [password, setPassword] = useState('pharma123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Load active hospital codes from Supabase
  useEffect(() => {
    fetchActiveHospitalCodes().then((codes) => {
      if (codes && codes.length > 0) {
        setHospitalList(codes);
      }
    });
  }, []);

  const matchedHospital = findHospitalByCode(hospitalCode, hospitalList);

  const handleSelectQuickAccount = (hCode: string, pId: string, pwd: string) => {
    setHospitalCode(hCode);
    setPharmacistId(pId);
    setPassword(pwd);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hospitalCode.trim()) {
      setErrorMessage('Please enter the Hospital Code.');
      return;
    }
    if (!matchedHospital) {
      setErrorMessage(
        'Invalid hospital code. Accepted codes: 560017 (WellnessVibes), 560076 (Narayana), 560034 (Spandana)'
      );
      return;
    }
    if (!pharmacistId.trim()) {
      setErrorMessage('Please enter your Pharmacist ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatusMessage('Connecting to Supabase clinical database...');

    try {
      const result = await authenticatePharmacist(hospitalCode, pharmacistId, password);

      if (!result.success || !result.pharmacist) {
        setIsAuthenticating(false);
        setAuthStatusMessage(null);
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      setAuthStatusMessage('Verifying hospital permissions & security clearance...');

      setTimeout(() => {
        setAuthStatusMessage(`Access Granted: ${result.pharmacist!.name} (${result.pharmacist!.hospitalName})`);

        if (rememberMe) {
          localStorage.setItem('active_pharmacist_id', result.pharmacist!.id);
          localStorage.setItem('active_pharmacist_hospital', result.pharmacist!.hospitalCode || '');
        }

        setTimeout(() => {
          setIsAuthenticating(false);
          onLoginSuccess(result.pharmacist!);
        }, 500);
      }, 600);
    } catch (err: any) {
      setIsAuthenticating(false);
      setAuthStatusMessage(null);
      setErrorMessage(err?.message || 'Network error occurred during authentication.');
    }
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
                Pharmacist Dispensing Portal
              </span>
            </div>
          </div>

          {/* Right: Protocol Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-full border border-[#E5DFCE] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#2F5D3F] animate-pulse"></span>
              <span className="text-[11px] font-semibold text-[#1F2F4F] uppercase tracking-wider">
                Supabase Authenticated
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full shadow-xs border border-[#E5DFCE]">
              <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">lock</span>
              <span className="text-[11px] font-semibold text-[#1F2F4F]">
                Hospital Scoped
              </span>
            </div>
          </div>
        </div>

        {/* Central Card with Soft Glow */}
        <div className="w-full flex items-center justify-center py-4 relative">
          <div className="absolute w-[440px] h-[440px] bg-[#E9B8C4]/25 rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* Pharmacist Master Login Card */}
          <div className="w-full max-w-[480px] bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-[#E5DFCE] flex flex-col relative">
            {/* Top Status Accent Pill */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9B8C4] text-[#1F2F4F] text-[11px] font-bold tracking-wide">
                <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
                Clinical Station Auth
              </span>
              <span className="text-[11px] text-[#2F5D3F] font-semibold bg-[#2F5D3F]/10 px-2.5 py-0.5 rounded-full">
                DATABASE REGISTERED
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div className="flex flex-col mb-4 text-left">
              <h1 className="font-serif text-3xl sm:text-[34px] font-bold text-[#2F5D3F] tracking-tight leading-tight">
                Pharmacist Login
              </h1>
              <p className="text-xs text-[#1F2F4F]/80 mt-1 font-normal leading-relaxed">
                Authorized clinical personnel only. Pharmacist registration is managed directly in Supabase database.
              </p>
            </div>

            {/* Database Registration Notice Banner */}
            <div className="mb-5 p-3 rounded-xl bg-[#FAF7EE] border border-[#2F5D3F]/20 flex items-start gap-2 text-left">
              <span className="material-symbols-outlined text-[#2F5D3F] text-[18px] shrink-0 mt-0.5">
                admin_panel_settings
              </span>
              <div className="text-[11px] text-[#1F2F4F]">
                <strong className="text-[#2F5D3F] block font-semibold">Database-Managed Access:</strong>
                Accounts are provisioned by hospital administrators via Supabase. Public registration is strictly disabled.
              </div>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 text-left animate-fade-in">
                <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0">
                  error
                </span>
                <span className="leading-snug font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              {/* Hospital Code Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2F4F]" htmlFor="hospitalCode">
                    <span className="material-symbols-outlined text-[17px] text-[#2F5D3F]">domain</span>
                    Hospital Code <span className="text-red-500">*</span>
                  </label>
                  {matchedHospital && (
                    <span className="text-[11px] text-[#2F5D3F] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      {matchedHospital.name}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    id="hospitalCode"
                    type="text"
                    required
                    value={hospitalCode}
                    onChange={(e) => {
                      setHospitalCode(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. 560017, 560076, 560034"
                    className="w-full h-11 px-3.5 bg-[#FAF7EE] text-[#1F2F4F] text-sm rounded-xl border border-[#E5DFCE] focus:bg-white focus:border-[#2F5D3F] focus:ring-2 focus:ring-[#2F5D3F]/15 focus:outline-none transition-all font-mono uppercase"
                  />
                </div>
                <span className="text-[10px] text-[#1F2F4F]/60">
                  Allowed: 560017 (WellnessVibes), 560076 (Narayana), 560034 (Spandana)
                </span>
              </div>

              {/* Pharmacist ID Field */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2F4F]" htmlFor="pharmacistId">
                  <span className="material-symbols-outlined text-[17px] text-[#2F5D3F]">badge</span>
                  Pharmacist ID / Staff Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="pharmacistId"
                    type="text"
                    required
                    value={pharmacistId}
                    onChange={(e) => {
                      setPharmacistId(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. PH-1001"
                    className="w-full h-11 px-3.5 bg-[#FAF7EE] text-[#1F2F4F] text-sm rounded-xl border border-[#E5DFCE] focus:bg-white focus:border-[#2F5D3F] focus:ring-2 focus:ring-[#2F5D3F]/15 focus:outline-none transition-all font-mono uppercase"
                  />
                  <span className="absolute right-3 text-[#2F5D3F] flex items-center pointer-events-none" title="Staff credential">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2F4F]" htmlFor="authPassword">
                  <span className="material-symbols-outlined text-[17px] text-[#2F5D3F]">key</span>
                  Terminal Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="authPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter station password"
                    className="w-full h-11 pl-3.5 pr-10 bg-[#FAF7EE] text-[#1F2F4F] text-sm rounded-xl border border-[#E5DFCE] focus:bg-white focus:border-[#2F5D3F] focus:ring-2 focus:ring-[#2F5D3F]/15 focus:outline-none transition-all tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-[#1F2F4F]/60 hover:text-[#2F5D3F] transition-colors rounded cursor-pointer"
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
                  <span className="text-xs text-[#1F2F4F] font-medium">Keep station logged in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[#2F5D3F] font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Login Button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-11 bg-[#2F5D3F] text-white hover:bg-[#234730] active:scale-[0.99] text-sm uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 font-semibold mt-1 disabled:opacity-80 cursor-pointer"
              >
                <span>{isAuthenticating ? 'AUTHENTICATING STATION...' : 'LOGIN TO DISPENSING BAY'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>

            {/* Dynamic Status Toast */}
            {authStatusMessage && (
              <div className="mt-4 p-3 bg-[#FAF7EE] border border-[#2F5D3F]/30 rounded-xl flex items-center gap-2 text-[#2F5D3F] text-xs transition-all animate-fade-in text-left">
                <span className="material-symbols-outlined text-[18px] text-[#2F5D3F] animate-spin">
                  sync
                </span>
                <span className="font-semibold">{authStatusMessage}</span>
              </div>
            )}

            {/* Registered Pharmacists Reference (Configured in Supabase) */}
            <div className="mt-6 pt-4 border-t border-[#E5DFCE] text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#1F2F4F]/60">
                  Provisioned Hospital Staff (Supabase)
                </span>
                <span className="text-[10px] text-[#2F5D3F] font-bold">Default pwd: pharma123</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    id: 'PH-1001',
                    name: 'Dr. Priya Sharma',
                    hospCode: '560017',
                    hospName: 'WellnessVibes',
                    role: 'Clinical Pharmacist',
                  },
                  {
                    id: 'PH-1002',
                    name: 'Dr. Aris Klein',
                    hospCode: '560076',
                    hospName: 'Narayana',
                    role: 'Staff Dispensing',
                  },
                  {
                    id: 'PH-1003',
                    name: 'Dr. Rajesh Nair',
                    hospCode: '560034',
                    hospName: 'Spandana',
                    role: 'Lead Compounding',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectQuickAccount(item.hospCode, item.id, 'pharma123')}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border cursor-pointer ${
                      pharmacistId === item.id && hospitalCode === item.hospCode
                        ? 'bg-[#E9B8C4]/30 border-[#2F5D3F] text-[#1F2F4F] font-semibold'
                        : 'bg-[#FAF7EE]/70 hover:bg-[#FAF7EE] border-transparent text-[#1F2F4F]/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#2F5D3F] bg-white px-1.5 py-0.5 rounded border border-[#E5DFCE]">
                        {item.id}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#1F2F4F]/70">
                      {item.hospName} ({item.hospCode})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Footer Marker */}
        <div className="w-full text-center pt-6">
          <p className="text-xs text-[#1F2F4F]/70 tracking-wide flex items-center justify-center gap-2 flex-wrap">
            <span>Authorized hospital personnel only</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9B8C4]"></span>
            <span>Smart Pharmacy DISPENSARY • Supabase Linked</span>
          </p>
        </div>
      </div>

      {/* Forgot Password / Administrator Notice Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-[#E5DFCE] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
                  admin_panel_settings
                </span>
                <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                  Password Reset Protocol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded text-[#1F2F4F]/60 hover:text-[#1F2F4F] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-[#1F2F4F]/80">
              <p>
                In compliance with clinical security standards, pharmacist credentials cannot be reset self-service.
              </p>
              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE]">
                <strong className="block text-[#2F5D3F] mb-1 font-semibold">How to reset:</strong>
                Hospital IT administrators can update your password directly in the{' '}
                <code className="text-[#2F5D3F] font-mono font-bold">pharmacists</code> table inside the Supabase project dashboard.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#2F5D3F] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
