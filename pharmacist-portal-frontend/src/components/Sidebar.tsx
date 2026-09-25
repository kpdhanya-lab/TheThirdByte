import React from 'react';
import { Pharmacist } from '../types';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  pendingCount: number;
  currentPharmacist: Pharmacist;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  onLogout,
  pendingCount,
  currentPharmacist,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isRouteActive = (route: string) => {
    if (route === 'dashboard') return currentRoute === 'dashboard';
    if (route === 'prescriptions') {
      return (
        currentRoute === 'prescriptions' ||
        currentRoute === 'pending-prescriptions' ||
        currentRoute === 'prescription-review' ||
        currentRoute === 'approved-ready'
      );
    }
    if (route === 'transactions') return currentRoute === 'transactions' || currentRoute === 'audit';
    if (route === 'dispensing-monitor') {
      return (
        currentRoute === 'dispensing-monitor' ||
        currentRoute === 'dispensing-complete' ||
        currentRoute === 'dispensing'
      );
    }
    return currentRoute === route;
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'space_dashboard',
      badge: null,
      target: 'dashboard',
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: 'receipt_long',
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      target: 'prescriptions',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: 'fingerprint',
      badge: null,
      target: 'transactions',
    },
    {
      id: 'dispensing-monitor',
      label: 'Dispensing Unit',
      icon: 'medication',
      badge: 'Live',
      target: 'dispensing-monitor',
    },
  ];

  const handleItemClick = (target: string) => {
    onNavigate(target);
    onCloseMobile();
  };

  const handleLogoutClick = () => {
    onCloseMobile();
    onLogout();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#2F5D3F] text-white text-left select-none shadow-lg">
      {/* Top Section */}
      <div className="p-5 space-y-6">
        {/* Brand & Terminal Station Indicator */}
        <div className="pb-4 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#2F5D3F] flex items-center justify-center shadow-xs font-bold">
              <span className="material-symbols-outlined text-[20px]">local_pharmacy</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold text-white tracking-wide leading-tight">
                SMART PHARMACY
              </span>
              <span className="text-[10px] font-sans font-semibold uppercase text-[#E9B8C4] tracking-widest">
                DISPENSARY
              </span>
            </div>
          </div>
        </div>

        {/* Station Live Badge */}
        <div className="px-3 py-2 rounded-xl bg-black/15 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E9B8C4] animate-pulse"></span>
            <span className="font-sans text-[11px] text-white/90 font-medium">
              Station {currentPharmacist.station}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase text-[#E9B8C4] font-semibold">
            Online
          </span>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white/60 px-3 block mb-2">
            Workflow Navigation
          </span>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isRouteActive(item.target);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.target)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-white text-[#2F5D3F] shadow-sm font-semibold'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[19px] ${
                        active ? 'text-[#2F5D3F]' : 'text-[#E9B8C4]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full ${
                        active
                          ? 'bg-[#E9B8C4] text-[#1F2F4F]'
                          : 'bg-[#E9B8C4] text-[#1F2F4F]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Pharmacist Profile & Logout */}
      <div className="p-4 border-t border-white/15 space-y-3">
        <div className="p-3 rounded-xl bg-black/20 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E9B8C4] text-[#1F2F4F] font-bold text-xs flex items-center justify-center shrink-0">
            {currentPharmacist.avatarInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate leading-tight">
              {currentPharmacist.name}
            </span>
            <span className="text-[10px] text-white/70 truncate font-mono">
              {currentPharmacist.licenseNumber}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-[#E9B8C4] hover:text-[#1F2F4F] text-white text-xs font-semibold transition-all border border-white/15"
        >
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span>Lock Station / Logout</span>
        </button>

        <div className="text-center pt-1">
          <span className="text-[9px] font-sans text-white/50 tracking-wider uppercase">
            Smart Pharmacy v2.4 • DEA EPCS
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#1F2F4F]/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
