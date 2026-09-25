import React from 'react';
import { PatientProfile, PrescriptionOrder, ViewMode } from '../types';
import {
  CheckCircle2,
  FileUp,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface DashboardViewProps {
  patient: PatientProfile;
  order: PrescriptionOrder;
  onNavigate: (view: ViewMode) => void;
  onOpenCounterDirections: () => void;
  onOpenPickupPass: () => void;
  onOpenPharmacistChat: () => void;
  onPlayChime: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patient,
  onNavigate,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-8 px-4 flex flex-col gap-4">
      {/* Patient Welcome Header */}
      <section className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-[#7a545e] tracking-widest uppercase">
            Smart Pharmacy Patient Portal
          </span>
          <div className="inline-flex items-center gap-1 bg-[#f8f3e4] px-2.5 py-0.5 rounded-full border border-[#164529]/15">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#164529]" />
            <span className="text-[11px] text-[#164529] font-bold">Verified Patient</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl text-[#164529] tracking-tight leading-tight">
          Welcome,{' '}
          <span className="font-serif italic font-normal text-[#7a545e]">{patient.name}</span>
        </h1>

        {patient.hospitalName && (
          <div className="inline-flex items-center gap-1.5 bg-[#ede8d9] px-3 py-1 rounded-full border border-[#164529]/15 text-xs text-[#164529] font-medium w-fit mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#164529] shrink-0" />
            <span>
              <strong className="font-semibold">{patient.hospitalName}</strong>
              {patient.hospitalArea ? `, ${patient.hospitalArea}` : ''}
              {patient.hospitalCode ? ` • ${patient.hospitalCode}` : patient.hospitalPin ? ` • PIN: ${patient.hospitalPin}` : ''}
            </span>
          </div>
        )}
      </section>

      {/* Upload Prescription Action Card */}
      <div className="relative bg-[#164529] text-[#ffffff] rounded-2xl p-4 sm:p-5 shadow-md overflow-hidden flex flex-col gap-3">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#ffffff]/15 rounded-full text-[10px] text-[#bbefc7] font-semibold">
            <Sparkles className="w-3 h-3 text-[#ffcdd9]" />
            <span>Prescription Upload</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-[#ffffff] leading-tight">
            Upload Your Prescription
          </h2>
          <p className="text-xs text-[#a2d4ae] leading-relaxed">
            Need a refill or received a new doctor slip? Upload a photo or PDF for prompt review by
            our pharmacist.
          </p>
        </div>

        <div className="flex flex-col gap-2 z-10 pt-1">
          <button
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#ffd9e1] text-[#164529] hover:bg-[#ffcdd9] text-xs font-bold tracking-wider uppercase rounded-full shadow transition-transform active:scale-98 cursor-pointer min-h-[46px]"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload New Prescription +</span>
          </button>
          <span className="text-[10px] text-[#a2d4ae] text-center">
            Accepted: PDF, JPG, PNG up to 25MB • Optical OCR Active
          </span>
        </div>
      </div>
    </div>
  );
};
