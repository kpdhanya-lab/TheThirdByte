import React from 'react';
import { Pharmacist } from '../types';

interface HeaderProps {
  currentPharmacist: Pharmacist | null;
  onLockTerminal: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onToggleSidebar?: () => void;
  isLoggedIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPharmacist,
  onLockTerminal,
  currentRoute,
  onNavigate,
  onToggleSidebar,
  isLoggedIn,
}) => {
  const isTabActive = (routeKey: string) => {
    if (routeKey === 'dashboard') return currentRoute === 'dashboard';
    if (routeKey === 'prescriptions') {
      return (
        currentRoute === 'prescriptions' ||
        currentRoute === 'pending-prescriptions' ||
        currentRoute === 'prescription-review' ||
        currentRoute === 'approved-ready'
      );
    }
    if (routeKey === 'transactions') return currentRoute === 'transactions' || currentRoute === 'audit';
    if (routeKey === 'dispensing-monitor') {
      return (
        currentRoute === 'dispensing-monitor' ||
        currentRoute === 'dispensing-complete' ||
        currentRoute === 'dispensing'
      );
    }
    return currentRoute === routeKey;
  };

  return (
    <header className="w-full py-3.5 px-4 sm:px-6 bg-[#F5F0E1] border-b border-[#E5DFCE] transition-colors sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between flex-wrap gap-3">
        {/* Brand Logo & Name + Mobile Sidebar Toggle Button */}
        <div className="flex items-center gap-3">
          {isLoggedIn && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title="Toggle Navigation Sidebar"
              className="lg:hidden p-2 rounded-xl bg-white border border-[#E5DFCE] text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          )}

          <div
            onClick={() => isLoggedIn && onNavigate('dashboard')}
            className={`flex items-center gap-3 ${isLoggedIn ? 'cursor-pointer hover:opacity-90' : ''}`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#2F5D3F] flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[20px]">local_pharmacy</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif text-xl sm:text-2xl font-bold text-[#2F5D3F] tracking-tight leading-tight">
                SMART PHARMACY
              </span>
              <span className="text-[10px] font-sans font-semibold uppercase text-[#1F2F4F]/70 tracking-widest hidden sm:block">
                Smart Pharmacy DISPENSARY
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (if logged in) */}
        {isLoggedIn && (
          <nav className="hidden md:flex items-center gap-1.5 bg-white/70 p-1.5 rounded-2xl border border-[#E5DFCE] shadow-xs">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isTabActive('dashboard')
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F] hover:bg-[#FAF7EE]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('prescriptions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isTabActive('prescriptions')
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F] hover:bg-[#FAF7EE]'
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => onNavigate('dispensing-monitor')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isTabActive('dispensing-monitor')
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F] hover:bg-[#FAF7EE]'
              }`}
            >
              Dispensing Unit
            </button>
            <button
              onClick={() => onNavigate('transactions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isTabActive('transactions')
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F] hover:bg-[#FAF7EE]'
              }`}
            >
              Transactions
            </button>
          </nav>
        )}

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-3">
          {isLoggedIn && currentPharmacist ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-xl border border-[#E5DFCE] shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#E9B8C4] text-[#1F2F4F] flex items-center justify-center font-bold text-xs">
                  {currentPharmacist.avatarInitials}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#1F2F4F] leading-tight">
                    {currentPharmacist.name}
                  </span>
                  <span className="text-[10px] text-[#2F5D3F] font-mono font-medium">
                    {currentPharmacist.id} • {currentPharmacist.station}
                  </span>
                </div>
              </div>

              <button
                onClick={onLockTerminal}
                title="Lock Terminal Station"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E9B8C4]/30 text-[#1F2F4F] border border-[#E5DFCE] text-xs font-semibold transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">lock</span>
                <span>Lock Station</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#1F2F4F] bg-white px-3.5 py-1.5 rounded-full border border-[#E5DFCE] shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">
                verified_user
              </span>
              <span className="text-[11px] font-semibold tracking-wide uppercase">
                Terminal Security Level 4
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav tabs if logged in */}
      {isLoggedIn && (
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 border-t border-[#E5DFCE] mt-2.5">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isTabActive('dashboard') ? 'bg-[#2F5D3F] text-white' : 'text-[#1F2F4F]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('prescriptions')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isTabActive('prescriptions') ? 'bg-[#2F5D3F] text-white' : 'text-[#1F2F4F]'
            }`}
          >
            Prescriptions
          </button>
          <button
            onClick={() => onNavigate('dispensing-monitor')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isTabActive('dispensing-monitor') ? 'bg-[#2F5D3F] text-white' : 'text-[#1F2F4F]'
            }`}
          >
            Dispensing Unit
          </button>
          <button
            onClick={() => onNavigate('transactions')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isTabActive('transactions') ? 'bg-[#2F5D3F] text-white' : 'text-[#1F2F4F]'
            }`}
          >
            Transactions
          </button>
        </div>
      )}
    </header>
  );
};
