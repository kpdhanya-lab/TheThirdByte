import React, { useState, useEffect } from 'react';
import { Prescription, Pharmacist } from '../types';
import {
  resolveExtractedData,
  requestGenerateDispenseToken,
  fetchDispenseTokenForPrescription,
  updatePrescriptionStatusInSupabase,
} from '../utils/supabase';

interface DispensingBayProps {
  prescriptions: Prescription[];
  currentPharmacist: Pharmacist;
  onUpdatePrescription: (updated: Prescription) => void;
  onOpenNewRxModal: () => void;
  workflowStep?: 'dashboard' | 'review' | 'ready' | 'dispensing-monitor' | 'dispensing-complete' | 'all';
  targetRxNumber?: string;
  onNavigate?: (route: string, rxNumber?: string) => void;
  onBack?: () => void;
  onRecordTransaction?: (rx: Prescription, details: string) => void;
}

export const DispensingBay: React.FC<DispensingBayProps> = ({
  prescriptions,
  currentPharmacist,
  onUpdatePrescription,
  onOpenNewRxModal,
  workflowStep = 'all',
  targetRxNumber,
  onNavigate,
  onBack,
  onRecordTransaction,
}) => {
  const [selectedRxNumber, setSelectedRxNumber] = useState<string>(
    targetRxNumber || prescriptions[0]?.rxNumber || ''
  );
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Verification States
  const [scannedNdc, setScannedNdc] = useState('');
  const [isNdcVerified, setIsNdcVerified] = useState(false);
  const [countedPills, setCountedPills] = useState<number>(0);
  const [isCountingActive, setIsCountingActive] = useState(false);
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<1 | 2 | 3>(1);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Sync selected prescription if targetRxNumber changes
  useEffect(() => {
    if (targetRxNumber && prescriptions.some((p) => p.rxNumber === targetRxNumber)) {
      setSelectedRxNumber(targetRxNumber);
    }
  }, [targetRxNumber, prescriptions]);

  const selectedRx =
    prescriptions.find((p) => p.rxNumber === selectedRxNumber) || prescriptions[0];

  // Filtering for queue pane
  const filteredList = prescriptions.filter((p) => {
    const matchesPriority = filterPriority === 'ALL' || p.priority === filterPriority;
    const matchesSearch =
      p.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.rxNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medication.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  // Handle switching prescription
  const handleSelectPrescription = (rx: Prescription) => {
    setSelectedRxNumber(rx.rxNumber);
    setScannedNdc('');
    setIsNdcVerified(rx.status === 'Ready for Dispense' || rx.status === 'Dispensed');
    setCountedPills(
      rx.status === 'Ready for Dispense' || rx.status === 'Dispensed' ? rx.quantity : 0
    );
    setActionSuccessMessage(null);
  };

  // Simulate scanning the bottle
  const handleSimulateScan = () => {
    if (!selectedRx) return;
    setScannedNdc(selectedRx.medication.ndc);
    setIsNdcVerified(true);
  };

  // Simulate auto-counting tray
  const handleAutoCount = () => {
    if (!selectedRx) return;
    setIsCountingActive(true);
    let count = 0;
    const target = selectedRx.quantity;
    const interval = setInterval(() => {
      count += Math.ceil(target / 8);
      if (count >= target) {
        count = target;
        clearInterval(interval);
        setIsCountingActive(false);
      }
      setCountedPills(count);
    }, 60);
  };

  // Handle mark ready (Clinical verification sign-off & Token Generation)
  const handleMarkReady = async () => {
    if (!selectedRx) return;
    setIsGeneratingToken(true);
    let activeToken = selectedRx.dispenseToken;

    try {
      const tokenResult = await requestGenerateDispenseToken({
        prescriptionId: selectedRx.id || selectedRx.rxNumber,
        slot: selectedSlot,
        patientName: selectedRx.patient.name,
        patientId: selectedRx.patient.id,
      });

      if (tokenResult && tokenResult.success && tokenResult.token) {
        activeToken = tokenResult.token;
      }
    } catch (err) {
      console.warn('Error during token generation in handleMarkReady:', err);
    } finally {
      setIsGeneratingToken(false);
    }

    const updated: Prescription = {
      ...selectedRx,
      status: 'Ready for Dispense',
      verifiedBy: currentPharmacist.name,
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      vendingSlot: `Slot 0${selectedSlot}`,
      dispenseToken: activeToken,
    };
    onUpdatePrescription(updated);
    updatePrescriptionStatusInSupabase(selectedRx.rxNumber, 'Ready for Dispense');

    if (onNavigate) {
      onNavigate('approved-ready', selectedRx.rxNumber);
    } else {
      setActionSuccessMessage(
        `Prescription ${selectedRx.rxNumber} verified, assigned to Slot 0${selectedSlot}, and dispense token created.`
      );
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  // Handle finalize dispense
  const handleApproveAndDispense = async () => {
    if (!selectedRx) return;
    setIsGeneratingToken(true);
    let activeToken = selectedRx.dispenseToken;

    try {
      const tokenResult = await requestGenerateDispenseToken({
        prescriptionId: selectedRx.id || selectedRx.rxNumber,
        slot: selectedSlot,
        patientName: selectedRx.patient.name,
        patientId: selectedRx.patient.id,
      });

      if (tokenResult && tokenResult.success && tokenResult.token) {
        activeToken = tokenResult.token;
      }
    } catch (err) {
      console.warn('Error during token generation in handleApproveAndDispense:', err);
    } finally {
      setIsGeneratingToken(false);
    }

    const updated: Prescription = {
      ...selectedRx,
      status: 'Dispensed',
      verifiedBy: currentPharmacist.name,
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      vendingSlot: `Slot 0${selectedSlot}`,
      dispenseToken: activeToken,
    };
    onUpdatePrescription(updated);
    updatePrescriptionStatusInSupabase(selectedRx.rxNumber, 'Dispensed');

    if (onRecordTransaction) {
      onRecordTransaction(
        updated,
        `Prescription ${selectedRx.rxNumber} (${selectedRx.medication.name} ${selectedRx.medication.strength}) certified, packaged in Slot 0${selectedSlot}, and marked DISPENSED at station ${currentPharmacist.station}.`
      );
    }

    if (onNavigate) {
      onNavigate('dispensing-complete', selectedRx.rxNumber);
    } else {
      setActionSuccessMessage(
        `Prescription ${selectedRx.rxNumber} clinically verified, assigned to Slot 0${selectedSlot}, and marked DISPENSED.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  // -------------------------------------------------------------
  // SCREEN 2: PHARMACIST DASHBOARD VIEW
  // -------------------------------------------------------------
  if (workflowStep === 'dashboard') {
    const pendingCount = prescriptions.filter((p) => p.status === 'Pending Review').length;
    const readyCount = prescriptions.filter((p) => p.status === 'Ready for Dispense').length;
    const dispensedCount = prescriptions.filter((p) => p.status === 'Dispensed').length;
    const nextPending = prescriptions.find((p) => p.status === 'Pending Review') || prescriptions[0];

    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
        {/* Dashboard Station Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2F5D3F] animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#1F2F4F]/70">
                Live Terminal: {currentPharmacist.station}
              </span>
              <span className="text-xs text-[#E5DFCE]">|</span>
              <span className="text-xs font-semibold text-[#1F2F4F] bg-[#E9B8C4] px-2.5 py-0.5 rounded-full">
                Pharmacist Dashboard
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F]">
              Dispensary Operations Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenNewRxModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7EE] border border-[#2F5D3F]/30 text-[#2F5D3F] text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>Intake e-Prescription</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-[#E5DFCE] text-xs font-mono text-[#1F2F4F] shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">local_police</span>
              <span>DEA EPCS Certified</span>
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate && onNavigate('prescriptions')}
            className="bg-white p-5 rounded-2xl border border-[#E5DFCE] shadow-xs hover:border-[#2F5D3F] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#1F2F4F]/70">Pending Queue</span>
              <span className="w-8 h-8 rounded-xl bg-[#E9B8C4] text-[#1F2F4F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </span>
            </div>
            <div className="font-serif text-3xl font-bold text-[#2F5D3F]">{pendingCount}</div>
            <div className="text-xs text-[#1F2F4F]/80 flex items-center justify-between pt-1 border-t border-[#E5DFCE]">
              <span>Awaiting Pharmacist Sign-off</span>
              <span className="text-[#2F5D3F] font-bold">Open →</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate && onNavigate('dispensing-monitor', nextPending?.rxNumber)}
            className="bg-white p-5 rounded-2xl border border-[#E5DFCE] shadow-xs hover:border-[#2F5D3F] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#1F2F4F]/70">Ready for Dispense</span>
              <span className="w-8 h-8 rounded-xl bg-[#2F5D3F]/10 text-[#2F5D3F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">shelves</span>
              </span>
            </div>
            <div className="font-serif text-3xl font-bold text-[#2F5D3F]">{readyCount}</div>
            <div className="text-xs text-[#1F2F4F]/80 flex items-center justify-between pt-1 border-t border-[#E5DFCE]">
              <span>Staged in Ready Bins</span>
              <span className="text-[#2F5D3F] font-bold">Open →</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate && onNavigate('transactions')}
            className="bg-white p-5 rounded-2xl border border-[#E5DFCE] shadow-xs hover:border-[#2F5D3F] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#1F2F4F]/70">Dispensed Today</span>
              <span className="w-8 h-8 rounded-xl bg-[#E9B8C4]/40 text-[#1F2F4F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </span>
            </div>
            <div className="font-serif text-3xl font-bold text-[#2F5D3F]">{dispensedCount}</div>
            <div className="text-xs text-[#1F2F4F]/80 flex items-center justify-between pt-1 border-t border-[#E5DFCE]">
              <span>Immutable Ledger Logged</span>
              <span className="text-[#2F5D3F] font-bold">Audit →</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate && onNavigate('dispensing-monitor')}
            className="bg-white p-5 rounded-2xl border border-[#E5DFCE] shadow-xs hover:border-[#2F5D3F] cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#1F2F4F]/70">Dispensary Station</span>
              <span className="w-8 h-8 rounded-xl bg-[#FAF7EE] text-[#1F2F4F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
              </span>
            </div>
            <div className="font-serif text-2xl font-bold text-[#2F5D3F]">Station {currentPharmacist.station}</div>
            <div className="text-xs text-[#1F2F4F]/80 flex items-center justify-between pt-1 border-t border-[#E5DFCE]">
              <span>Optical Tray Calibrated</span>
              <span className="text-[#2F5D3F] font-bold">Monitor →</span>
            </div>
          </div>
        </div>

        {/* Priority Action Callout Banner */}
        {nextPending && (
          <div className="bg-white border border-[#E5DFCE] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-sans uppercase px-2 py-0.5 rounded-full bg-[#E9B8C4] text-[#1F2F4F]">
                  PRIORITY {nextPending.priority}
                </span>
                <span className="text-xs font-mono text-[#2F5D3F] font-semibold">
                  Next Order in Triage Queue • Rx #{nextPending.rxNumber}
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#2F5D3F]">
                {nextPending.patient.name} — {nextPending.medication.name} {nextPending.medication.strength}
              </h2>
              <p className="text-xs text-[#1F2F4F]/80 max-w-2xl">{nextPending.sig}</p>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('prescription-review', nextPending.rxNumber)}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2F5D3F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#234730] transition-all shadow-xs cursor-pointer"
            >
              <span>Begin Prescription Review</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Recent Prescriptions Table */}
        <div className="bg-white rounded-2xl border border-[#E5DFCE] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5DFCE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
                clinical_notes
              </span>
              <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                Active Workstation Orders
              </h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('prescriptions')}
              className="text-xs font-semibold text-[#2F5D3F] hover:underline cursor-pointer"
            >
              View All Orders ({prescriptions.length}) →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7EE] border-b border-[#E5DFCE] text-[#1F2F4F]/75 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Patient Name</th>
                  <th className="py-3.5 px-4 font-semibold">Patient ID</th>
                  <th className="py-3.5 px-4 font-semibold">Prescription No</th>
                  <th className="py-3.5 px-4 font-semibold">Medicine</th>
                  <th className="py-3.5 px-4 font-semibold">Dosage</th>
                  <th className="py-3.5 px-4 font-semibold">Time</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DFCE]">
                {prescriptions.slice(0, 5).map((rx) => (
                  <tr
                    key={rx.rxNumber}
                    onClick={() =>
                      onNavigate && onNavigate('prescription-review', rx.rxNumber)
                    }
                    className="hover:bg-[#FAF7EE] transition-colors h-[54px] cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-serif text-sm font-bold text-[#1F2F4F] group-hover:text-[#2F5D3F] transition-colors">
                      {rx.patient.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#1F2F4F]/80">
                      {rx.patient.id}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#2F5D3F]">
                      {rx.rxNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#1F2F4F]">{rx.medication.name}</span>
                      {rx.medication.strength && (
                        <span className="text-[11px] text-[#1F2F4F]/60 ml-1.5 font-mono">
                          ({rx.medication.strength})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1F2F4F]">
                      {rx.dosageText || `${rx.quantity} tabs`}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1F2F4F]/80">
                      {rx.time || '1:00 PM'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          rx.status === 'Pending Review' || rx.status === 'Pending'
                            ? 'bg-[#E9B8C4]/60 text-[#1F2F4F]'
                            : rx.status === 'Ready for Dispense'
                            ? 'bg-[#2F5D3F]/15 text-[#2F5D3F]'
                            : rx.status === 'Dispensed'
                            ? 'bg-[#2F5D3F]/10 text-[#2F5D3F]'
                            : 'bg-[#FAF7EE] text-[#1F2F4F]/80'
                        }`}
                      >
                        {rx.status === 'Pending Review' ? 'Pending' : rx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate && onNavigate('prescription-review', rx.rxNumber);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white font-semibold text-xs transition-all cursor-pointer shadow-xs uppercase tracking-wider"
                      >
                        REVIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 5: PRESCRIPTION APPROVED / READY FOR DISPENSING VIEW
  // -------------------------------------------------------------
  if (workflowStep === 'ready' && selectedRx) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
        {/* Top Header with Back button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {onBack && (
                <button
                  onClick={onBack}
                  title="Go back to Prescription Review"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to Review</span>
                </button>
              )}
              <span className="text-[10px] font-sans uppercase bg-[#E9B8C4] text-[#1F2F4F] px-2.5 py-0.5 rounded-full font-bold">
                Prescription Approved / Ready
              </span>
              <span className="text-xs font-sans uppercase text-[#1F2F4F]/60 font-medium">
                Station {currentPharmacist.station}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
              Prescription Staging & Ready Bin
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('prescriptions')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5DFCE] text-[#2F5D3F] text-xs font-semibold hover:bg-[#FAF7EE] cursor-pointer"
            >
              Prescription Queue
            </button>
          </div>
        </div>

        {/* Staging Confirmation Card */}
        <div className="bg-white rounded-2xl border border-[#E5DFCE] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DFCE]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9B8C4] text-[#1F2F4F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div>
                <span className="text-xs font-sans uppercase text-[#2F5D3F] font-bold tracking-wider">
                  Order Clinically Approved & Staged
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2F5D3F]">
                  {selectedRx.patient.name} — Rx #{selectedRx.rxNumber}
                </h2>
              </div>
            </div>

            <div className="bg-[#FAF7EE] px-4 py-2.5 rounded-xl border border-[#E5DFCE] text-right">
              <span className="text-[10px] font-sans uppercase text-[#1F2F4F]/60 block font-semibold">Staging Location</span>
              <span className="font-mono text-sm font-bold text-[#2F5D3F]">
                {selectedRx.vendingSlot ? `Kiosk Dispenser ${selectedRx.vendingSlot}` : `Kiosk Dispenser Slot 0${selectedSlot}`}
              </span>
              {selectedRx.dispenseToken && (
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-[#bbefc7]/40 border border-[#164529]/20 text-[11px] font-mono font-bold text-[#164529] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">key</span>
                    <span>{typeof selectedRx.dispenseToken === 'object' ? selectedRx.dispenseToken.token : selectedRx.dispenseToken}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-1">
              <span className="text-[10px] font-sans uppercase text-[#1F2F4F]/60 block font-semibold">Prescribed Medication</span>
              <span className="font-bold text-sm text-[#2F5D3F] block">
                {selectedRx.medication.name} {selectedRx.medication.strength}
              </span>
              <span className="text-[#1F2F4F]/80 block">{selectedRx.medication.dosageForm}</span>
              <span className="text-[11px] font-mono text-[#1F2F4F]/60 block">NDC: {selectedRx.medication.ndc}</span>
            </div>

            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-1">
              <span className="text-[10px] font-sans uppercase text-[#1F2F4F]/60 block font-semibold">SIG Directions</span>
              <p className="text-xs text-[#1F2F4F] font-medium leading-relaxed">{selectedRx.sig}</p>
              <span className="text-[11px] text-[#1F2F4F]/60 block pt-1 font-mono">
                Qty: {selectedRx.quantity} • Days Supply: {selectedRx.daysSupply}
              </span>
            </div>

            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-1">
              <span className="text-[10px] font-sans uppercase text-[#1F2F4F]/60 block font-semibold">Clinical Verification Stamp</span>
              <span className="font-semibold text-xs text-[#1F2F4F] block">
                Verified by: {selectedRx.verifiedBy || currentPharmacist.name}
              </span>
              <span className="text-[11px] text-[#1F2F4F]/60 block font-mono">
                Timestamp: {selectedRx.verifiedAt || new Date().toLocaleString()}
              </span>
              <span className="text-[10px] text-[#2F5D3F] font-mono block">
                Station: {currentPharmacist.station} • Lic: {currentPharmacist.licenseNumber}
              </span>
            </div>
          </div>

          {/* Next Action Callout */}
          <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <h3 className="font-serif text-base font-bold text-[#2F5D3F]">
                Proceed to Physical Dispensing Verification
              </h3>
              <p className="text-xs text-[#1F2F4F]/80">
                Scan the NDC barcode on the prescription stock bottle and perform optical pill count verification.
              </p>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('dispensing-monitor', selectedRx.rxNumber)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all whitespace-nowrap cursor-pointer"
            >
              <span>START DISPENSING</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 7: DISPENSING COMPLETE VIEW
  // -------------------------------------------------------------
  if (workflowStep === 'dispensing-complete' && selectedRx) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
        {/* Top Header with Back button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {onBack && (
                <button
                  onClick={onBack}
                  title="Go back to Dispensing Monitor"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to Dispensing Monitor</span>
                </button>
              )}
              <span className="text-[10px] font-sans uppercase bg-[#E9B8C4] text-[#1F2F4F] px-2.5 py-0.5 rounded-full font-bold">
                Dispensing Complete
              </span>
              <span className="text-xs font-sans uppercase text-[#1F2F4F]/60 font-medium">
                Audit Trail Recorded
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
              Dispensing Finalized & Certified
            </h1>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('transactions', selectedRx.rxNumber)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">fingerprint</span>
            <span>View Transaction Details</span>
          </button>
        </div>

        {/* Complete Certificate Card */}
        <div className="bg-white rounded-2xl border border-[#E5DFCE] p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E5DFCE]">
            <div className="w-12 h-12 rounded-2xl bg-[#2F5D3F] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <span className="text-xs font-sans uppercase text-[#2F5D3F] font-bold tracking-wider">
                Certification Complete • Packaging Sealed
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2F5D3F]">
                Prescription {selectedRx.rxNumber} Successfully Dispensed
              </h2>
            </div>
          </div>

          {/* Cryptographic Digital Signature Stamp */}
          <div className="p-4 bg-[#FAF7EE] rounded-2xl border border-[#E5DFCE] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFCE]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2F5D3F]">
                <span className="material-symbols-outlined text-[17px]">security</span>
                <span>Pharmacist Digital Signature Stamp (21 CFR Part 11 & DEA EPCS)</span>
              </div>
              <span className="text-[10px] font-mono text-[#1F2F4F]/60">
                HS-256 HMAC Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#1F2F4F]/60 block uppercase font-mono">Pharmacist</span>
                <span className="font-semibold text-[#1F2F4F]">{currentPharmacist.name}</span>
                <span className="text-[10px] text-[#1F2F4F]/60 block font-mono">Lic: {currentPharmacist.licenseNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#1F2F4F]/60 block uppercase font-mono">Terminal Workstation</span>
                <span className="font-semibold text-[#1F2F4F]">{currentPharmacist.station}</span>
                <span className="text-[10px] text-[#1F2F4F]/60 block font-mono">TPM 2.0 Security Module</span>
              </div>
              <div>
                <span className="text-[10px] text-[#1F2F4F]/60 block uppercase font-mono">Cryptographic Hash</span>
                <span className="font-mono text-[11px] text-[#2F5D3F] break-all">
                  sha256:7f01a...991c
                </span>
                <span className="text-[10px] text-[#1F2F4F]/60 block font-mono">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Order Summary & Label Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-[#E5DFCE] space-y-2 text-xs">
              <span className="font-bold text-[#2F5D3F] block">Prescription Summary</span>
              <div className="flex justify-between py-1 border-b border-[#E5DFCE]">
                <span className="text-[#1F2F4F]/60">Patient:</span>
                <span className="font-semibold text-[#1F2F4F]">{selectedRx.patient.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5DFCE]">
                <span className="text-[#1F2F4F]/60">Medication:</span>
                <span className="font-semibold text-[#1F2F4F]">{selectedRx.medication.name} {selectedRx.medication.strength}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5DFCE]">
                <span className="text-[#1F2F4F]/60">Quantity Dispensed:</span>
                <span className="font-semibold text-[#1F2F4F]">{selectedRx.quantity} Tablets</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#1F2F4F]/60">Copay Collected:</span>
                <span className="font-semibold text-[#1F2F4F]">${selectedRx.patient.copayAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E5DFCE] space-y-3 text-xs flex flex-col justify-between">
              <div>
                <span className="font-bold text-[#2F5D3F] block">Thermal Vial Label Status</span>
                <p className="text-[11px] text-[#1F2F4F]/80 mt-1">
                  Vial container label printed with 2D DataMatrix barcode and auxiliary warnings.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowLabelPreview(true)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#E5DFCE] text-[#2F5D3F] border border-[#E5DFCE] font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Reprint / Preview Label</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E5DFCE]">
            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-white border border-[#E5DFCE] text-[#2F5D3F] text-xs font-semibold hover:bg-[#FAF7EE] cursor-pointer"
            >
              Return to Dashboard
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('prescriptions')}
                className="px-4 py-2 rounded-xl bg-white border border-[#2F5D3F] text-[#2F5D3F] text-xs font-semibold hover:bg-[#FAF7EE] cursor-pointer"
              >
                Verify Next Pending Prescription
              </button>
              <button
                onClick={() => onNavigate && onNavigate('transactions', selectedRx.rxNumber)}
                className="px-5 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#234730] shadow-xs cursor-pointer"
              >
                View Transaction Details & Audit Log →
              </button>
            </div>
          </div>
        </div>

        {/* Modal Label Preview */}
        {showLabelPreview && selectedRx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E5DFCE]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
                <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                  Thermal Prescription Label Preview
                </h3>
                <button
                  onClick={() => setShowLabelPreview(false)}
                  className="w-8 h-8 rounded-xl hover:bg-[#FAF7EE] flex items-center justify-center text-[#1F2F4F]/60"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="my-4 p-5 bg-[#FAF7EE] border-2 border-dashed border-[#E5DFCE] rounded-xl font-mono text-xs space-y-2 text-[#1F2F4F]">
                <div className="text-center pb-2 border-b border-[#E5DFCE]">
                  <strong className="text-sm font-serif text-[#2F5D3F]">SMART PHARMACY DISPENSARY</strong><br/>
                  <span>400 Clinical Pavilion Way • (800) 555-0199</span><br/>
                  <span className="text-[10px] text-[#1F2F4F]/60">Rx #{selectedRx.rxNumber} • Date: {selectedRx.dateWritten}</span>
                </div>

                <div className="py-1">
                  <span className="text-sm font-bold block">{selectedRx.patient.name.toUpperCase()}</span>
                  <span>{selectedRx.patient.dob} • Dr. {selectedRx.prescriber.name}</span>
                </div>

                <div className="py-2 px-2.5 bg-white border border-[#E5DFCE] rounded-xl">
                  <strong className="text-sm block text-[#2F5D3F]">{selectedRx.medication.name.toUpperCase()} {selectedRx.medication.strength}</strong>
                  <span className="text-[11px] block mt-0.5">{selectedRx.sig}</span>
                </div>

                <div className="flex justify-between text-[11px] pt-1">
                  <span>QTY: {selectedRx.quantity} Tablets</span>
                  <span>REFILLS: {selectedRx.refillsRemaining}</span>
                  <span>EXP: {selectedRx.medication.expirationDate}</span>
                </div>

                <div className="text-[10px] text-[#BA1A1A] pt-1 border-t border-[#E5DFCE]">
                  CAUTION: Federal law prohibits dispensing without prescription. Keep out of reach of children.
                </div>

                <div className="text-center pt-2 font-mono text-[10px] text-[#1F2F4F]/60">
                  ||| | ||||| |||| || |||||||| | |||| |||| ||||||
                  <br />
                  NDC: {selectedRx.medication.ndc}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DFCE]">
                <button
                  onClick={() => setShowLabelPreview(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-[#1F2F4F]/70 hover:bg-[#FAF7EE]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 4: PRESCRIPTION REVIEW / SCREEN 6: DISPENSING MONITOR / DEFAULT BAY
  // -------------------------------------------------------------
  const isReviewMode = workflowStep === 'review';
  const isDispensingMode = workflowStep === 'dispensing-monitor';

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left">
      {/* Top Banner with Station Info & Functional Back button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                title="Go back to previous step"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>
                  {isReviewMode
                    ? 'Back to Pending Prescriptions'
                    : isDispensingMode
                    ? 'Back to Approved / Ready'
                    : 'Back to Dashboard'}
                </span>
              </button>
            )}
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F5D3F] animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#1F2F4F]/70">
              Live Terminal: {currentPharmacist.station}
            </span>
            <span className="text-xs text-[#E5DFCE]">|</span>
            <span className="text-xs font-semibold text-[#1F2F4F] bg-[#E9B8C4] px-2.5 py-0.5 rounded-full">
              {isReviewMode ? 'Prescription Review' : isDispensingMode ? 'Dispensing Monitor' : 'Dispensary Bay'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
            {isReviewMode
              ? 'Prescription Review'
              : isDispensingMode
              ? 'Dispensing Monitor'
              : 'Clinical Verification & Dispensing Bay'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenNewRxModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7EE] border border-[#2F5D3F]/30 text-[#2F5D3F] text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">add_circle</span>
            <span>Intake e-Prescription</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-[#E5DFCE] text-xs font-mono text-[#1F2F4F] shadow-xs">
            <span className="material-symbols-outlined text-[16px] text-[#2F5D3F]">local_police</span>
            <span>DEA EPCS Compliant</span>
          </div>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="mt-4 p-3.5 bg-[#FAF7EE] border border-[#2F5D3F]/30 rounded-xl flex items-center justify-between text-[#2F5D3F] text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-[#2F5D3F] hover:opacity-75"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 12-Column Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Left 5 Columns: Prescription Queue Context */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Queue Filter Controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5DFCE] shadow-xs space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#1F2F4F]/60">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, Rx#, drug name..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl focus:bg-white focus:outline-none focus:border-[#2F5D3F] text-[#1F2F4F]"
              />
            </div>

            {/* Priority Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {['ALL', 'STAT', 'Urgent', 'Routine'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    filterPriority === p
                      ? 'bg-[#2F5D3F] text-white shadow-xs'
                      : 'bg-[#FAF7EE] text-[#1F2F4F] hover:bg-[#E5DFCE]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Item List */}
          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredList.map((rx) => {
              const isSelected = rx.rxNumber === selectedRxNumber;
              return (
                <div
                  key={rx.rxNumber}
                  onClick={() => handleSelectPrescription(rx)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all text-left ${
                    isSelected
                      ? 'bg-white border-[#2F5D3F] ring-2 ring-[#2F5D3F]/20 shadow-md'
                      : 'bg-white border-[#E5DFCE] hover:border-[#2F5D3F]/40 hover:bg-[#FAF7EE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-bold text-sm text-[#2F5D3F]">
                      {rx.patient.name}
                    </span>
                    <span
                      className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        rx.priority === 'STAT'
                          ? 'bg-[#E9B8C4] text-[#1F2F4F]'
                          : rx.priority === 'Urgent'
                          ? 'bg-[#FAF1E4] text-[#C47D2B]'
                          : 'bg-[#FAF7EE] text-[#1F2F4F]'
                      }`}
                    >
                      {rx.priority}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F2F4F]">
                      {rx.medication.name} {rx.medication.strength}
                    </span>
                    <span className="font-mono text-[11px] text-[#1F2F4F]/60">{rx.rxNumber}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-[#E5DFCE]">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        rx.status === 'Dispensed'
                          ? 'bg-[#2F5D3F]/10 text-[#2F5D3F]'
                          : rx.status === 'Ready for Dispense'
                          ? 'bg-[#E9B8C4] text-[#1F2F4F]'
                          : 'bg-[#FAF7EE] text-[#1F2F4F]/70'
                      }`}
                    >
                      {rx.status}
                    </span>
                    <span className="text-[#1F2F4F]/60 font-mono">
                      Qty: {rx.quantity} • Refills: {rx.refillsRemaining}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Columns: Clinical Verification & Dispensing Workbench */}
        {selectedRx ? (
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Digitized Prescription Summary Card */}
            {(() => {
              const extractedSummary = resolveExtractedData(selectedRx);
              return (
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#164529]/15 space-y-5">
                  {/* Card Header & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#164529]/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#164529]" />
                        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#164529]">
                          Digitized Prescription Summary
                        </h2>
                      </div>
                      <p className="text-xs text-[#555f56]">
                        Extracted via Groq Vision (Qwen 3.8) structured output. Review the digitized items below.
                      </p>
                    </div>

                    {/* Prescriber Signature Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#414942]">Prescriber Signature:</span>
                      {extractedSummary.signature_present === 'present' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          <span>Signature Verified</span>
                        </span>
                      ) : extractedSummary.signature_present === 'absent' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#ba1a1a] border border-[#fad2cf]">
                          <span className="material-symbols-outlined text-[15px]">cancel</span>
                          <span>Signature Absent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                          <span className="material-symbols-outlined text-[15px]">help_outline</span>
                          <span>Signature Unclear</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8f3e4] p-3.5 sm:p-4 rounded-2xl border border-[#164529]/10 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                        PATIENT
                      </span>
                      <span className="font-semibold text-[#1d1c13] text-sm">
                        {extractedSummary.patient_name || selectedRx.patient.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                        DOB / AGE &amp; WEIGHT
                      </span>
                      <span className="font-semibold text-[#1d1c13]">
                        {extractedSummary.patient_dob || extractedSummary.patient_age
                          ? `${extractedSummary.patient_dob ? extractedSummary.patient_dob + ' ' : ''}${
                              extractedSummary.patient_age ? `(${extractedSummary.patient_age})` : ''
                            }`
                          : selectedRx.patient.dob
                          ? `${selectedRx.patient.dob} (${selectedRx.patient.age}y / ${selectedRx.patient.gender})`
                          : 'Age unstated'}{' '}
                        • {extractedSummary.patient_weight || `${selectedRx.patient.weightKg} kg`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                        PRESCRIBER
                      </span>
                      <span className="font-semibold text-[#1d1c13] block">
                        {extractedSummary.prescriber_name || selectedRx.prescriber.name}
                      </span>
                      {(extractedSummary.prescriber_clinic || selectedRx.prescriber.clinic) && (
                        <span className="text-[10px] text-[#555f56] block truncate">
                          {extractedSummary.prescriber_clinic || selectedRx.prescriber.clinic}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                        DATE WRITTEN
                      </span>
                      <span className="font-semibold text-[#1d1c13]">
                        {extractedSummary.date_written || selectedRx.dateWritten || 'Undated'}
                      </span>
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-sm font-bold text-[#164529] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#164529]">link</span>
                        <span>Medications &amp; Dosage Safety Triage</span>
                      </h3>
                      <span className="text-xs text-[#555f56] font-medium">
                        {extractedSummary.medications.length}{' '}
                        {extractedSummary.medications.length === 1 ? 'Medication' : 'Medications'} detected
                      </span>
                    </div>

                    {extractedSummary.medications.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#f8f3e4] text-center text-xs text-[#555f56]">
                        No distinct medications were legible on this prescription. A pharmacist will review the raw scan manually.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[#164529]/15">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#ede8d9] text-[#164529] font-serif border-b border-[#164529]/15">
                              <th className="py-2.5 px-3 font-bold w-8 text-center">#</th>
                              <th className="py-2.5 px-3 font-bold min-w-[140px]">Medication Name</th>
                              <th className="py-2.5 px-3 font-bold min-w-[110px]">Strength &amp; Form</th>
                              <th className="py-2.5 px-3 font-bold w-14 text-center">Qty</th>
                              <th className="py-2.5 px-3 font-bold min-w-[140px]">Sig (Directions)</th>
                              <th className="py-2.5 px-3 font-bold w-24 text-center">Legibility</th>
                              <th className="py-2.5 px-3 font-bold min-w-[170px]">Dosage Safety Triage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#164529]/10">
                            {extractedSummary.medications.map((med, idx) => {
                              const isFlagged = med.dosage_safety_flag === 'review_recommended';
                              return (
                                <tr
                                  key={idx}
                                  className={`hover:bg-[#fcfaf4] transition-colors ${
                                    isFlagged ? 'bg-[#fff9f9]' : idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#faf7ee]'
                                  }`}
                                >
                                  <td className="py-3 px-3 text-center text-[#717971] font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`font-semibold ${
                                        med.legibility === 'illegible'
                                          ? 'text-[#ba1a1a] italic'
                                          : 'text-[#1d1c13]'
                                      }`}
                                    >
                                      {med.medication_name || '[Unreadable Name]'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-[#414942]">
                                    <div>{med.strength || '—'}</div>
                                    {med.dosage_form && (
                                      <div className="text-[10px] text-[#717971] uppercase font-mono">{med.dosage_form}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center text-[#414942] font-mono text-[11px]">
                                    {med.quantity || '—'}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-[11px] text-[#164529] font-medium bg-[#164529]/[0.02]">
                                    {med.sig || '—'}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {med.legibility === 'legible' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                                        Legible
                                      </span>
                                    ) : med.legibility === 'partially_legible' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                                        Partially Legible
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#ba1a1a] border border-[#fad2cf]">
                                        Illegible
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    {med.dosage_safety_flag === 'review_recommended' ? (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#ba1a1a] border border-[#fad2cf]">
                                          <span className="material-symbols-outlined text-[13px]">warning</span>
                                          <span>Review Recommended</span>
                                        </span>
                                        {med.dosage_safety_reason && (
                                          <p className="text-[10px] text-[#ba1a1a] italic leading-tight">
                                            {med.dosage_safety_reason}
                                          </p>
                                        )}
                                      </div>
                                    ) : med.dosage_safety_flag === 'not_determinable' ? (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                                          <span className="material-symbols-outlined text-[13px]">help_outline</span>
                                          <span>Not Determinable</span>
                                        </span>
                                        {med.dosage_safety_reason && (
                                          <p className="text-[10px] text-[#555f56] italic leading-tight">
                                            {med.dosage_safety_reason}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                          <span>Normal Range</span>
                                        </span>
                                        {med.dosage_safety_reason && (
                                          <p className="text-[10px] text-[#555f56] italic leading-tight">
                                            {med.dosage_safety_reason}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Clinical Safety Notice Banner */}
                  <div className="p-3 bg-[#ede8d9]/50 rounded-xl border border-[#164529]/10 flex items-start gap-2.5 text-[11px] text-[#555f56]">
                    <span className="material-symbols-outlined text-[18px] text-[#164529] shrink-0 mt-0.5">
                      verified_user
                    </span>
                    <p>
                      <strong className="text-[#164529]">Clinical Safety Notice:</strong> This dosage safety
                      comparison is an automated triage aid comparing strength/quantity against stated patient
                      weight and age. It is NOT clinical advice. A licensed pharmacist verifies all items prior to
                      dispensing.
                    </p>
                  </div>

                  {/* Pharmacist Notes (Optional) */}
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-[#1F2F4F]/80 block mb-1">
                      Pharmacist Verification &amp; Clinical Notes:
                    </label>
                    <textarea
                      value={pharmacistNotes}
                      onChange={(e) => setPharmacistNotes(e.target.value)}
                      placeholder="Record counseling notes, clinical interaction override rationale, or prescriber consultations..."
                      rows={2}
                      className="w-full p-2.5 text-xs bg-[#FAF7EE] border border-[#164529]/15 rounded-xl focus:bg-white focus:outline-none focus:border-[#2F5D3F] text-[#1F2F4F]"
                    />
                  </div>

                  {/* Automated Dispenser Slot Assignment */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-[#1F2F4F]/80 block mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#2F5D3F]">view_carousel</span>
                        <span>Automated Kiosk Dispenser Slot:</span>
                      </span>
                      <span className="text-[10px] text-[#2F5D3F] font-bold">Issues Live One-Time Token</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((slotNum) => (
                        <button
                          key={slotNum}
                          type="button"
                          onClick={() => setSelectedSlot(slotNum as 1 | 2 | 3)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            selectedSlot === slotNum
                              ? 'bg-[#2F5D3F] text-white border-[#2F5D3F] shadow-xs'
                              : 'bg-[#FAF7EE] text-[#1F2F4F] border-[#E5DFCE] hover:bg-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">view_carousel</span>
                          <span>Slot 0{slotNum}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons for Review Mode (Retain Print Label and Approve Commands) */}
                  {isReviewMode && (
                    <div className="pt-3 border-t border-[#164529]/10 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setShowLabelPreview(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7EE] hover:bg-[#E5DFCE] text-[#1F2F4F] border border-[#E5DFCE] text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[17px]">print</span>
                        <span>Print Label</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleMarkReady}
                          disabled={isGeneratingToken}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isGeneratingToken ? (
                            <>
                              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                              <span>GENERATING TOKEN...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">verified</span>
                              <span>APPROVE &amp; ISSUE TOKEN</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Station Physical Dispensing Verification (Tray & Sensor) - Shown in Dispensing Mode or Full Mode */}
            {(!isReviewMode || isDispensingMode) && (
              <div className="bg-white rounded-2xl p-5 border border-[#E5DFCE] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
                      qr_code_scanner
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                      Station Physical Dispensing Verification Tray
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#1F2F4F]/60">
                    Sensor Hardware: OPTIC-BAY-3B
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Barcode Verification */}
                  <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1F2F4F]">
                        Stock Bottle Barcode Scan:
                      </span>
                      {isNdcVerified && (
                        <span className="text-[10px] font-mono text-[#2F5D3F] bg-[#2F5D3F]/10 px-2 py-0.5 rounded-lg font-bold">
                          NDC MATCH CONFIRMED
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={scannedNdc}
                        onChange={(e) => {
                          setScannedNdc(e.target.value);
                          setIsNdcVerified(e.target.value === selectedRx.medication.ndc);
                        }}
                        placeholder="Scan or enter NDC..."
                        className="flex-1 h-9 px-3 text-xs font-mono bg-white border border-[#E5DFCE] rounded-xl focus:outline-none focus:border-[#2F5D3F] text-[#1F2F4F]"
                      />
                      <button
                        type="button"
                        onClick={handleSimulateScan}
                        className="px-3 py-1.5 bg-[#2F5D3F] text-white text-xs font-semibold rounded-xl hover:bg-[#234730] transition-colors cursor-pointer"
                      >
                        Simulate Scan
                      </button>
                    </div>
                    <span className="text-[10px] text-[#1F2F4F]/60 block font-mono">
                      Expected NDC: {selectedRx.medication.ndc} (Lot {selectedRx.medication.lotNumber})
                    </span>
                  </div>

                  {/* Optical Pill Count Sensor */}
                  <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1F2F4F]">
                        Digital Optical Pill Count:
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          countedPills === selectedRx.quantity ? 'text-[#2F5D3F]' : 'text-[#C47D2B]'
                        }`}
                      >
                        {countedPills} / {selectedRx.quantity} Tablets
                      </span>
                    </div>

                    <div className="w-full bg-[#E5DFCE] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          countedPills === selectedRx.quantity ? 'bg-[#2F5D3F]' : 'bg-[#E9B8C4]'
                        }`}
                        style={{
                          width: `${Math.min(100, (countedPills / (selectedRx.quantity || 1)) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleAutoCount}
                        disabled={isCountingActive}
                        className="text-xs font-semibold text-[#2F5D3F] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>
                          {isCountingActive ? 'Optical Sensors Counting...' : 'Auto-Count Tray Sensor'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCountedPills(selectedRx.quantity)}
                        className="text-[10px] text-[#1F2F4F]/60 hover:underline cursor-pointer"
                      >
                        Manual Count Pass
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verification Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5DFCE]">
                  <button
                    type="button"
                    onClick={() => setShowLabelPreview(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#E5DFCE] text-[#1F2F4F] border border-[#E5DFCE] text-xs font-semibold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">print</span>
                    <span>Preview Prescription Vial Label</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Slot Picker */}
                    <div className="flex items-center gap-1.5 bg-[#FAF7EE] p-1 rounded-xl border border-[#E5DFCE]">
                      <span className="text-[10px] uppercase font-bold text-[#1F2F4F]/70 px-1">Slot:</span>
                      {[1, 2, 3].map((slotNum) => (
                        <button
                          key={slotNum}
                          type="button"
                          onClick={() => setSelectedSlot(slotNum as 1 | 2 | 3)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedSlot === slotNum
                              ? 'bg-[#2F5D3F] text-white shadow-xs'
                              : 'text-[#1F2F4F] hover:bg-white'
                          }`}
                        >
                          0{slotNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkReady}
                      disabled={isGeneratingToken}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7EE] text-[#2F5D3F] border border-[#2F5D3F] text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingToken ? 'Generating...' : `Stage in Ready Slot 0${selectedSlot}`}
                    </button>

                    <button
                      type="button"
                      onClick={handleApproveAndDispense}
                      disabled={selectedRx.status === 'Dispensed' || isGeneratingToken}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>
                        {selectedRx.status === 'Dispensed' ? 'Dispensed' : 'Authorize & Dispense'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white p-12 rounded-2xl text-center border border-[#E5DFCE]">
            <span className="material-symbols-outlined text-4xl text-[#1F2F4F]/60">inventory_2</span>
            <p className="text-sm text-[#1F2F4F]/80 mt-2">
              Select a prescription from the queue to start verification.
            </p>
          </div>
        )}
      </div>

      {/* Vial Label Print Preview Modal */}
      {showLabelPreview && selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E5DFCE]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
              <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                Thermal Prescription Label Preview
              </h3>
              <button
                onClick={() => setShowLabelPreview(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#FAF7EE] flex items-center justify-center text-[#1F2F4F]/60"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Label Canvas Container */}
            <div className="my-4 p-5 bg-[#FAF7EE] border-2 border-dashed border-[#E5DFCE] rounded-xl font-mono text-xs space-y-2 text-[#1F2F4F]">
              <div className="text-center pb-2 border-b border-[#E5DFCE]">
                <strong className="text-sm font-serif text-[#2F5D3F]">SMART PHARMACY DISPENSARY</strong><br/>
                <span>400 Clinical Pavilion Way • (800) 555-0199</span><br/>
                <span className="text-[10px] text-[#1F2F4F]/60">Rx #{selectedRx.rxNumber} • Date: {selectedRx.dateWritten}</span>
              </div>

              <div className="py-1">
                <span className="text-sm font-bold block">{selectedRx.patient.name.toUpperCase()}</span>
                <span>{selectedRx.patient.dob} • Dr. {selectedRx.prescriber.name}</span>
              </div>

              <div className="py-2 px-2.5 bg-white border border-[#E5DFCE] rounded-xl">
                <strong className="text-sm block text-[#2F5D3F]">{selectedRx.medication.name.toUpperCase()} {selectedRx.medication.strength}</strong>
                <span className="text-[11px] block mt-0.5">{selectedRx.sig}</span>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>QTY: {selectedRx.quantity} Tablets</span>
                <span>REFILLS: {selectedRx.refillsRemaining}</span>
                <span>EXP: {selectedRx.medication.expirationDate}</span>
              </div>

              <div className="text-[10px] text-[#BA1A1A] pt-1 border-t border-[#E5DFCE]">
                CAUTION: Federal law prohibits dispensing without prescription. Keep out of reach of children.
              </div>

              <div className="text-center pt-2 font-mono text-[10px] text-[#1F2F4F]/60">
                ||| | ||||| |||| || |||||||| | |||| |||| ||||||
                <br />
                NDC: {selectedRx.medication.ndc}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DFCE]">
              <button
                onClick={() => setShowLabelPreview(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-[#1F2F4F]/70 hover:bg-[#FAF7EE] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActionSuccessMessage(
                    `Thermal barcode label sent to Station Printer ${currentPharmacist.station}-PRN-01`
                  );
                  setShowLabelPreview(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Send to Station Thermal Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
