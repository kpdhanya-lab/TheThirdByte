import React from 'react';
import { ViewMode } from '../types';
import { LOGO_URL } from '../data';

interface HeaderProps {
  currentView?: ViewMode;
  onNavigate: (view: ViewMode) => void;
  patientName?: string;
  tokenNumber?: string;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  return (
    <>
      {/* Top authentic apothecary awning stripe */}
      <div className="awning-stripe h-1.5 w-full fixed top-0 left-0 z-50"></div>

      <header className="sticky top-0 z-40 bg-[#fef9ea]/95 backdrop-blur-md border-b border-[#164529]/10 shadow-[0_1px_8px_rgba(45,61,93,0.05)] pt-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
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
            </div>
          </button>
        </div>
      </header>
    </>
  );
};

