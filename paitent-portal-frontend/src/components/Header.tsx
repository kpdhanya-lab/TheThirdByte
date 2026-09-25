import React from 'react';
import { ViewMode } from '../types';
import { LOGO_URL } from '../data';
import { LogOut, User, Building2 } from 'lucide-react';

interface HeaderProps {
  currentView?: ViewMode;
  onNavigate: (view: ViewMode) => void;
  patientName?: string;
  tokenNumber?: string;
  hospitalName?: string;
  onOpenNotifications?: () => void;
  notificationCount?: number;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  patientName,
  tokenNumber,
  hospitalName,
  onLogout,
  isLoggedIn,
}) => {
  return (
    <>
      {/* Top authentic apothecary awning stripe */}
      <div className="awning-stripe h-1.5 w-full fixed top-0 left-0 z-50"></div>

      <header className="sticky top-0 z-40 bg-[#fef9ea]/95 backdrop-blur-md border-b border-[#164529]/10 shadow-[0_1px_8px_rgba(45,61,93,0.05)] pt-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'home')}
            className="flex items-center gap-3 text-left group transition-transform focus:outline-none cursor-pointer"
            aria-label="Smart Pharmacy Home"
          >
            <div className="w-10 h-10 rounded-full p-0.5 bg-[#f3eedf] shadow-sm border border-[#164529]/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={LOGO_URL}
                alt="Smart Pharmacy Emblem"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg sm:text-xl text-[#164529] tracking-tight leading-tight">
                Smart Pharmacy
              </span>
              <span className="text-[10px] text-[#717971] tracking-wider uppercase font-semibold">
                Patient Portal
              </span>
            </div>
          </button>

          {/* Navigation & Patient info */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {hospitalName && (
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ede8d9] text-[#164529] text-xs font-semibold border border-[#164529]/10">
                    <Building2 className="w-3.5 h-3.5 text-[#164529]" />
                    <span className="truncate max-w-[150px]">{hospitalName}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#164529]/15 shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-[#164529] text-[#fef9ea] flex items-center justify-center text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#1d1c13] hidden sm:inline">
                    {patientName}
                  </span>
                  {tokenNumber && (
                    <span className="text-[11px] font-mono font-bold bg-[#ede8d9] text-[#164529] px-2 py-0.5 rounded-md">
                      {tokenNumber}
                    </span>
                  )}
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-2 rounded-full text-[#7a545e] hover:bg-[#ffd9e1]/50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {currentView !== 'login' && (
                  <button
                    onClick={() => onNavigate('login')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#164529] hover:bg-[#ede8d9] transition-all cursor-pointer"
                  >
                    LOGIN
                  </button>
                )}
                {currentView !== 'register' && (
                  <button
                    onClick={() => onNavigate('register')}
                    className="px-3.5 py-1.5 rounded-full bg-[#164529] text-[#fef9ea] text-xs font-bold hover:bg-[#2f5d3f] transition-all cursor-pointer shadow-xs"
                  >
                    REGISTER
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
