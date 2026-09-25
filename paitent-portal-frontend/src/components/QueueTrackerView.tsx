import React from 'react';
import { PatientProfile, PrescriptionOrder, ViewMode } from '../types';
import {
  Clock,
  Store,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface QueueTrackerViewProps {
  patient: PatientProfile;
  order: PrescriptionOrder;
  onNavigate: (view: ViewMode) => void;
  onOpenPickupPass: () => void;
  onOpenPharmacistChat: () => void;
  onPlayChime: () => void;
}

export const QueueTrackerView: React.FC<QueueTrackerViewProps> = ({
  patient,
  onOpenPickupPass,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      {/* Top Header & Pickup Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#164529] font-bold tracking-tight">
          Live Dispensing Queue &amp; Pickup Tracker
        </h1>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={onOpenPickupPass}
            className="px-4 py-2.5 rounded-full bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Pickup Pass &amp; QR</span>
          </button>
        </div>
      </div>

      {/* Hero Spotlight: Token & Details */}
      <div className="bg-[#164529] text-[#fef9ea] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        {/* Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#bbefc7]/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-6">
          {/* Token Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-6">
              {/* Monogram Badge */}
              <div className="bg-[#fef9ea] text-[#164529] px-4 sm:px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-md">
                <span className="text-[10px] font-bold text-[#7a545e] tracking-widest uppercase">
                  YOUR TOKEN
                </span>
                <span className="font-sans text-3xl sm:text-4xl text-[#164529] font-bold tracking-tight">
                  {patient.tokenNumber}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl sm:text-2xl text-[#ffffff] font-bold">
                    {patient.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2f5d3f] text-[#bbefc7] text-[10px] font-bold">
                    Primary Patient
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#ede8d9]">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#ffcdd9]" />
                    {patient.counterNumber} — Main Dispensary Hall
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#bbefc7]" />
                    Handover ETA: <strong className="text-[#ffffff]">10:48 AM</strong> (approx. 8
                    mins)
                  </span>
                </div>
              </div>
            </div>

            {/* Metric pill counters */}
            <div className="flex items-center gap-4 bg-[#ffffff]/10 backdrop-blur-md p-3 rounded-2xl border border-[#ffffff]/10 self-start lg:self-auto">
              <div className="flex flex-col pr-4 border-r border-[#ffffff]/15">
                <span className="text-[10px] uppercase font-bold text-[#a2d4ae]">
                  Queue Position
                </span>
                <span className="font-serif text-base sm:text-lg text-[#ffffff] font-bold">
                  4th In Line
                </span>
              </div>
              <div className="flex flex-col pl-1">
                <span className="text-[10px] uppercase font-bold text-[#a2d4ae]">
                  Preparation Status
                </span>
                <span className="font-serif text-base sm:text-lg text-[#ffcdd9] font-bold">
                  Stage 3 of 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Digital Pickup Pass & Barcode Card */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
        <div className="bg-[#ffffff] p-6 sm:p-8 rounded-3xl shadow-sm border border-[#164529]/15 flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-[#ede8d9]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#164529]">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Pickup Pass</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a545e]">
              COUNTER 03
            </span>
          </div>

          {/* Styled QR Code Frame */}
          <div
            onClick={onOpenPickupPass}
            className="p-4 bg-[#f8f3e4] rounded-2xl my-3 shadow-inner border border-[#164529]/10 cursor-pointer hover:border-[#164529]/30 transition-all group"
            title="Click to expand pass"
          >
            <svg className="w-44 h-44 text-[#164529]" fill="currentColor" viewBox="0 0 100 100">
              <path d="M0,0 h30 v30 h-30 z M6,6 h18 v18 h-18 z M10,10 h10 v10 h-10 z"></path>
              <path d="M70,0 h30 v30 h-30 z M76,6 h18 v18 h-18 z M80,10 h10 v10 h-10 z"></path>
              <path d="M0,70 h30 v30 h-30 z M6,76 h18 v18 h-18 z M10,80 h10 v10 h-10 z"></path>
              <rect height="24" width="6" x="36" y="6"></rect>
              <rect height="6" width="12" x="48" y="12"></rect>
              <rect height="6" width="18" x="42" y="24"></rect>
              <rect height="6" width="18" x="6" y="36"></rect>
              <rect height="8" width="8" x="36" y="36"></rect>
              <rect height="8" width="16" x="52" y="36"></rect>
              <rect height="6" width="18" x="76" y="36"></rect>
              <rect height="6" width="12" x="12" y="48"></rect>
              <rect height="12" width="12" x="30" y="48"></rect>
              <rect height="6" width="14" x="48" y="48"></rect>
              <rect height="12" width="12" x="68" y="48"></rect>
              <rect height="18" width="8" x="86" y="48"></rect>
              <rect height="6" width="18" x="6" y="60"></rect>
              <rect height="18" width="6" x="42" y="66"></rect>
              <rect height="6" width="12" x="54" y="60"></rect>
              <rect height="6" width="14" x="72" y="66"></rect>
              <rect height="14" width="12" x="36" y="80"></rect>
              <rect height="20" width="8" x="54" y="74"></rect>
              <rect height="12" width="26" x="68" y="82"></rect>
            </svg>
          </div>

          <span className="font-sans text-3xl font-bold text-[#164529] mt-1">
            {patient.tokenNumber}
          </span>
          <p className="text-xs sm:text-sm text-[#414942] max-w-xs mt-1 leading-relaxed">
            Present this pass or recite token number at{' '}
            <strong className="text-[#164529]">Counter 03</strong> when your chime sounds.
          </p>

          <button
            onClick={onOpenPickupPass}
            className="mt-4 w-full py-2.5 bg-[#f3eedf] hover:bg-[#ede8d9] rounded-xl text-xs font-bold text-[#164529] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Expand Digital Pickup Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
