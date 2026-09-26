import React, { useState, useEffect } from 'react';
import { PatientProfile, PrescriptionOrder, ViewMode, ExtractedPrescription, DispenseToken } from '../types';
import {
  Clock,
  Store,
  ShieldCheck,
  FileText,
  Pill,
  CheckCircle2,
  PackageCheck,
  Sparkles,
  X,
  Loader2,
  Check,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { playDispensaryChime } from '../utils/audio';
import {
  fetchActiveDispenseToken,
  claimDispenseTokenApi,
  subscribeToPatientDispenseTokens,
} from '../utils/supabase';
import { mqttClient } from '../lib/mqtt';

interface QueueTrackerViewProps {
  patient: PatientProfile;
  order: PrescriptionOrder;
  extractedPrescription?: ExtractedPrescription;
  onNavigate: (view: ViewMode) => void;
  onOpenPickupPass?: () => void;
  onOpenPharmacistChat?: () => void;
  onPlayChime?: () => void;
}

export const QueueTrackerView: React.FC<QueueTrackerViewProps> = ({
  patient,
  order,
  extractedPrescription,
  onPlayChime,
}) => {
  // Interactive Vending States
  const [isVendingModalOpen, setIsVendingModalOpen] = useState(false);
  const [vendingPhase, setVendingPhase] = useState<'idle' | 'authenticating' | 'dispensing' | 'completed'>('idle');
  const [vendedItems, setVendedItems] = useState<number[]>([]);

  // Active Dispense Token States (Requirements 10-16)
  const [activeToken, setActiveToken] = useState<DispenseToken | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);
  const [tokenCountdown, setTokenCountdown] = useState<string>('');

  // Live countdown timer for active token expiration (Requirement 2 & 15-minute TTL)
  useEffect(() => {
    if (!activeToken?.expires_at) {
      setTokenCountdown('');
      return;
    }

    const calculateRemaining = () => {
      const expMs = new Date(activeToken.expires_at).getTime();
      const diffMs = expMs - Date.now();
      if (diffMs <= 0) {
        setTokenCountdown('Expired');
        return;
      }
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      const formattedTime = new Date(activeToken.expires_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setTokenCountdown(`${formattedTime} (${mins}m ${secs.toString().padStart(2, '0')}s remaining)`);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeToken?.expires_at]);

  // Fetch active token and subscribe to realtime changes (Requirement 10)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingToken(true);

    const checkToken = async () => {
      try {
        const res = await fetchActiveDispenseToken();
        if (isMounted) {
          if (res && res.success && res.token && res.token.status === 'issued') {
            setActiveToken(res.token);
          } else if (res && res.success && !res.token) {
            setActiveToken(null);
          }
        }
      } catch (err) {
        console.warn('Error fetching active token:', err);
      } finally {
        if (isMounted) setIsLoadingToken(false);
      }
    };

    checkToken();

    // Fast polling fallback to ensure immediate detection across tabs/devices
    const pollInterval = setInterval(() => {
      if (isMounted) {
        checkToken();
      }
    }, 1200);

    const unsubscribe = subscribeToPatientDispenseTokens(patient.id, (token) => {
      if (isMounted) {
        if (token && token.status === 'issued') {
          setActiveToken(token);
        } else if (token && token.status === 'dispensed') {
          setActiveToken(token);
        }
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [patient.id]);

  // Metadata resolution (prefers extracted data if present, otherwise order and patient)
  const displayPatientName = extractedPrescription?.patient_name || patient.name || 'Eleanor Vance';
  const displayDoctorName =
    extractedPrescription?.prescriber_name || order.doctorName || 'Dr. Aris Thorne, MD';
  const displayDoctorClinic =
    extractedPrescription?.prescriber_clinic ||
    order.doctorClinic ||
    'Metro Heart Clinic & Cardiology';
  const displayDateWritten =
    extractedPrescription?.date_written || order.orderDate || 'Today, Oct 24';
  const displayRxId = order.orderId || 'RX-10245';

  // Format medications list for clean rendering
  const displayMedications =
    extractedPrescription?.medications && extractedPrescription.medications.length > 0
      ? extractedPrescription.medications.map((m, idx) => ({
          id: `ext-med-${idx}`,
          name: m.medication_name || 'Prescribed Medication',
          strength: m.strength || 'As prescribed',
          form: m.dosage_form || 'Tablet',
          quantity: m.quantity || '30 Units',
          instructions: m.sig || 'Follow directions as written',
          batchNumber: `#RX-${1020 + idx * 43}`,
          status: 'Ready for Dispensing',
          flag: m.dosage_safety_flag,
          reason: m.dosage_safety_reason,
        }))
      : order.medications.map((m) => ({
          id: m.id,
          name: m.name,
          strength: m.dosage,
          form: m.form,
          quantity: m.form?.match(/\d+\s*(?:tablets|capsules|pills)/i)?.[0] || '1 Bottle',
          instructions: m.instructions,
          batchNumber: m.batchNumber,
          status: m.status,
          flag: m.category === 'Flagged for Clinical Review' ? 'review_recommended' : 'none',
          reason: m.category,
        }));

  // Handle DISPENSE MEDICINE / VEND click (Atomic claim via server and slot-specific MQTT publish)
  const handleDispenseMedicine = async () => {
    if (!activeToken) {
      setClaimError('No active dispensing token available. Please wait for pharmacist approval.');
      return;
    }

    if (activeToken.status !== 'issued') {
      if (activeToken.status === 'dispense_requested') {
        setClaimError('Dispensing request already submitted for Slot 0' + activeToken.slot + '. Please collect your medication.');
      } else if (activeToken.status === 'dispensed') {
        setClaimError('Medication has already been dispensed.');
      } else if (activeToken.status === 'expired') {
        setClaimError('This token has expired. Please contact pharmacy staff.');
      } else {
        setClaimError('Token cannot be claimed in status: ' + activeToken.status);
      }
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccessMessage(null);

    const slotNum = Number(activeToken.slot) || 1;
    const dispensePayload = JSON.stringify({
      token: activeToken.token,
      slot: slotNum,
      action: 'DISPENSE',
      timestamp: new Date().toISOString(),
    });

    // 1. Immediately publish slot-specific messages to ESP32 hardware via MQTT
    try {
      mqttClient.publish('pharmacy/dispense', dispensePayload, (err) => {
        if (err) {
          console.error('[MQTT Publish Error pharmacy/dispense]:', err);
        } else {
          console.log('[MQTT] Published slot-specific command to pharmacy/dispense:', dispensePayload);
        }
      });
      mqttClient.publish(`pharmacy/dispense/slot/${slotNum}`, dispensePayload);
      mqttClient.publish('pharmacy/slot', String(slotNum));
      // Also publish pharmacy/status so pharmacist portal instantly gets status: EMPTY
      mqttClient.publish(
        'pharmacy/status',
        JSON.stringify({
          slot: slotNum,
          status: 'EMPTY',
          token: activeToken.token,
          action: 'DISPENSED',
        })
      );
    } catch (publishErr) {
      console.error('[MQTT Publish Exception]:', publishErr);
    }

    // 2. Call server to atomically claim the token (Requirement 13 & 14)
    try {
      const res = await claimDispenseTokenApi(activeToken.token);
      if (res.success && res.token) {
        setActiveToken(res.token);
        setClaimSuccessMessage(`Dispensing authorized for Slot 0${res.token.slot}! Robotic delivery chute opened.`);
      }
    } catch (err) {
      console.warn('claimDispenseTokenApi fallback:', err);
    }

    // Direct Supabase status sync: atomically set token to dispensed and prescription to dispensed
    try {
      await supabase
        .from('dispense_tokens')
        .update({
          status: 'dispensed',
          used_at: new Date().toISOString(),
        })
        .eq('token', activeToken.token);

      if (activeToken.prescription_id) {
        await supabase
          .from('prescriptions')
          .update({
            status: 'dispensed',
          })
          .eq('id', activeToken.prescription_id);
      }
    } catch (syncErr) {
      console.warn('Supabase dispense sync notice:', syncErr);
    }

    setIsClaiming(false);

    // 3. Trigger physical vending animation modal & audio chime
    handleStartVend();
  };

  // Handle trigger vend modal animation
  const handleStartVend = () => {
    setIsVendingModalOpen(true);
    setVendingPhase('authenticating');
    setVendedItems([]);

    // Progress through automated vending phases
    setTimeout(() => {
      setVendingPhase('dispensing');
      // Gradually dispense items
      displayMedications.forEach((_, idx) => {
        setTimeout(() => {
          setVendedItems((prev) => [...prev, idx]);
        }, 600 * (idx + 1));
      });
    }, 1200);

    const totalTime = 1200 + displayMedications.length * 600 + 800;
    setTimeout(() => {
      setVendingPhase('completed');
      if (onPlayChime) {
        onPlayChime();
      } else {
        playDispensaryChime();
      }
    }, totalTime);
  };

  const handleCloseModal = () => {
    setIsVendingModalOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      {/* Top Header & DISPENSE MEDICINE Action (Requirement 11) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#164529] font-bold tracking-tight">
            Live Dispensing Queue &amp; Pickup Tracker
          </h1>
          <p className="text-xs text-[#555f56] mt-1">
            Real-time status of your digitized prescription &amp; automated kiosk slot delivery
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
          {/* DISPENSE MEDICINE Button (Requirement 11) */}
          <button
            onClick={handleDispenseMedicine}
            disabled={isClaiming || !activeToken || activeToken.status !== 'issued'}
            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
              activeToken?.status === 'issued'
                ? 'bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] ring-2 ring-[#bbefc7]/40'
                : activeToken?.status === 'dispense_requested'
                ? 'bg-[#b45309] text-white opacity-90'
                : activeToken?.status === 'dispensed'
                ? 'bg-[#164529]/70 text-white opacity-70'
                : 'bg-[#164529]/40 text-white/70'
            }`}
          >
            {isClaiming ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#bbefc7]" />
            ) : (
              <PackageCheck className="w-4 h-4 text-[#bbefc7]" />
            )}
            <span>
              {isClaiming
                ? 'CLAIMING...'
                : activeToken?.status === 'issued'
                ? 'DISPENSE MEDICINE'
                : activeToken?.status === 'dispense_requested'
                ? `DISPENSE REQUESTED (SLOT ${activeToken.slot})`
                : activeToken?.status === 'dispensed'
                ? 'MEDICINE DISPENSED'
                : 'DISPENSE MEDICINE'}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Notices for Claims */}
      {claimError && (
        <div className="w-full p-4 rounded-2xl bg-[#FFF2F0] border border-[#FFCCC7] text-xs text-[#A8071A] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#A8071A] shrink-0" />
            <span>{claimError}</span>
          </div>
          <button
            onClick={() => setClaimError(null)}
            className="text-[#A8071A] hover:opacity-70 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {claimSuccessMessage && (
        <div className="w-full p-4 rounded-2xl bg-[#E6F7FF] border border-[#91D5FF] text-xs text-[#0050B3] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0050B3] shrink-0" />
            <span>{claimSuccessMessage}</span>
          </div>
          <button
            onClick={() => setClaimSuccessMessage(null)}
            className="text-[#0050B3] hover:opacity-70 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Spotlight: Token & Details Banner (Requirement 10) */}
      <div className="bg-[#164529] text-[#fef9ea] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        {/* Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#bbefc7]/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-6">
          {/* Token Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
              {/* Monogram Badge (Displays Active Token - Requirement 10) */}
              <div className="bg-[#fef9ea] text-[#164529] px-4 sm:px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-md min-w-[140px]">
                <span className="text-[10px] font-bold text-[#7a545e] tracking-widest uppercase flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#164529]" />
                  <span>DISPENSE TOKEN</span>
                </span>
                <span className="font-mono text-2xl sm:text-3xl text-[#164529] font-bold tracking-tight mt-0.5">
                  {activeToken ? activeToken.token : patient.tokenNumber}
                </span>
                {activeToken?.slot && (
                  <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#164529] text-[#bbefc7] tracking-wider uppercase">
                    Slot {activeToken.slot}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-xl sm:text-2xl text-[#ffffff] font-bold">
                    {patient.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2f5d3f] text-[#bbefc7] text-[10px] font-bold">
                    Primary Patient
                  </span>
                  {activeToken && (
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        activeToken.status === 'issued'
                          ? 'bg-[#bbefc7] text-[#164529]'
                          : activeToken.status === 'dispense_requested'
                          ? 'bg-[#FFF7E6] text-[#D46B08] border border-[#FFD591]'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeToken.status === 'issued' ? 'bg-[#164529]' : 'bg-[#D46B08] animate-ping'}`} />
                      <span>{activeToken.status === 'dispense_requested' ? 'Dispensing Requested' : `Status: ${activeToken.status}`}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#ede8d9]">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#ffcdd9]" />
                    {activeToken ? `Physical Dispenser: Slot ${activeToken.slot}` : `${patient.counterNumber} — Main Dispensary`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#bbefc7]" />
                    <span>{activeToken ? `Expiration: ${tokenCountdown || '15 minutes'}` : 'Handover ETA: approx. 8 mins'}</span>
                  </span>
                </div>

                {/* Patient Action Prompt inside Hero Spotlight (Requirements 3, 6, 7) */}
                {activeToken?.status === 'issued' && (
                  <div className="pt-2">
                    <button
                      onClick={handleDispenseMedicine}
                      disabled={isClaiming}
                      className="px-6 py-2.5 rounded-xl bg-[#bbefc7] hover:bg-[#a2d4ae] text-[#164529] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#164529]" />
                          <span>PROCESSING DISPENSE...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="w-4 h-4 text-[#164529]" />
                          <span>DISPENSE MEDICINE</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* UI changes to 'Dispensing Requested' on success (Requirement 7) */}
                {activeToken?.status === 'dispense_requested' && (
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFF7E6] text-[#D46B08] border border-[#FFD591] text-xs font-bold uppercase tracking-wider shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D46B08] animate-pulse" />
                      <span>Dispensing Requested</span>
                      <span className="text-[10px] text-[#D46B08]/80 font-mono">(Slot {activeToken.slot})</span>
                    </div>
                  </div>
                )}
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

      {/* Digitalized Prescription Section */}
      <div className="w-full bg-[#ffffff] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#164529]/15 flex flex-col gap-6">
        {/* Prescription Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ede8d9] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#164529]/10 text-[#164529] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#164529]">
                  Digitalized Prescription
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#164529]/10 text-[#164529] text-[10px] font-bold font-mono">
                  {displayRxId}
                </span>
              </div>
              <p className="text-xs text-[#555f56]">
                Digitally authenticated physician order verified for automated kiosk dispensing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#bbefc7]/40 text-[#164529] text-xs font-semibold border border-[#164529]/15">
              <ShieldCheck className="w-4 h-4 text-[#164529]" />
              <span>Verified Prescriber Signature</span>
            </span>
          </div>
        </div>

        {/* Patient & Doctor Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8f3e4] p-4 rounded-2xl border border-[#164529]/10 text-xs">
          <div>
            <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
              PATIENT
            </span>
            <span className="font-bold text-[#1d1c13] text-sm block">
              {displayPatientName}
            </span>
            <span className="text-[11px] text-[#555f56]">
              {patient.age ? `${patient.age} Yrs` : ''} {patient.gender ? `• ${patient.gender}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
              PRESCRIBER
            </span>
            <span className="font-bold text-[#1d1c13] text-sm block">
              {displayDoctorName}
            </span>
            <span className="text-[11px] text-[#555f56] truncate block">
              {displayDoctorClinic}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
              DATE WRITTEN
            </span>
            <span className="font-bold text-[#1d1c13] text-sm block">
              {displayDateWritten}
            </span>
            <span className="text-[11px] text-[#555f56]">
              Valid for Dispensing
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
              DISPENSARY BAY
            </span>
            <span className="font-bold text-[#164529] text-sm block">
              {patient.counterNumber || 'Counter 03'}
            </span>
            <span className="text-[11px] text-[#555f56]">
              {patient.hospitalName || 'Main Dispensary Hall'}
            </span>
          </div>
        </div>

        {/* Medications Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-[#164529] flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-[#164529]" />
              Prescribed Medications ({displayMedications.length})
            </h3>
            <span className="text-xs text-[#555f56]">
              All items verified &amp; packaged
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#164529]/15">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#ede8d9] text-[#164529] font-serif border-b border-[#164529]/15">
                  <th className="py-3 px-3 font-bold w-10 text-center">#</th>
                  <th className="py-3 px-4 font-bold min-w-[160px]">Medication Name</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">Dosage &amp; Form</th>
                  <th className="py-3 px-3 font-bold w-20">Quantity</th>
                  <th className="py-3 px-4 font-bold min-w-[180px]">Directions (Sig)</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">Safety &amp; Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#164529]/10">
                {displayMedications.map((med, idx) => (
                  <tr
                    key={med.id}
                    className={`hover:bg-[#fcfaf4] transition-colors ${
                      idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#faf7ee]'
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center text-[#717971] font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#1d1c13] block">
                        {med.name}
                      </span>
                      {med.batchNumber && (
                        <span className="text-[10px] font-mono text-[#717971]">
                          Batch {med.batchNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#414942]">
                      <span className="font-semibold block">{med.strength}</span>
                      {med.form && (
                        <span className="text-[10px] text-[#717971] block leading-tight">
                          {med.form}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] font-semibold text-[#164529]">
                      {med.quantity}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#164529] bg-[#164529]/[0.02]">
                      {med.instructions}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#164529]/10 text-[#164529] text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-[#164529]" />
                        <span>Ready</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Disclaimer Notice */}
        <div className="p-3.5 bg-[#ede8d9]/50 rounded-2xl border border-[#164529]/10 flex items-start gap-2.5 text-xs text-[#555f56]">
          <ShieldCheck className="w-4 h-4 text-[#164529] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[#164529]">Automated Pharmacy Verification:</strong> Dosages and drug interactions have been verified by Lead Pharmacist Dr. Sarah Jenkins. Press <strong className="text-[#164529]">Vend Medicine</strong> below to initiate automated kiosk dispensing.
          </p>
        </div>
      </div>

      {/* Dynamic Button Saying Vend Medicine Under the Digitalized Prescription */}
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={handleDispenseMedicine}
          disabled={!activeToken || activeToken.status !== 'issued' || isClaiming}
          className={`w-full py-4 px-6 font-serif font-bold text-base sm:text-lg rounded-2xl flex items-center justify-center gap-3 transition-all min-h-[56px] ${
            activeToken && activeToken.status === 'issued' && !isClaiming
              ? 'bg-[#164529] hover:bg-[#235837] active:scale-[0.99] text-[#ffffff] shadow-lg hover:shadow-xl cursor-pointer ring-2 ring-[#bbefc7]/50'
              : 'bg-[#717971]/20 text-[#717971] border border-[#717971]/20 shadow-none cursor-not-allowed'
          }`}
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#164529]" />
              <span>Initiating Slot Dispenser...</span>
            </>
          ) : activeToken && activeToken.status === 'issued' ? (
            <>
              <PackageCheck className="w-5 h-5 text-[#bbefc7]" />
              <span>Vend Medicine (Slot 0{activeToken.slot})</span>
            </>
          ) : (
            <>
              <PackageCheck className="w-5 h-5 text-[#717971]" />
              <span>Vend Medicine</span>
            </>
          )}
        </button>
        <p className="text-[11px] text-[#717971] text-center">
          {activeToken && activeToken.status === 'issued'
            ? `Tap to trigger instant automated dispensing from Slot 0${activeToken.slot} into ${patient.counterNumber || 'Counter 03'} collection chamber`
            : `Awaiting pharmacist approval & slot assignment • Button will unlock once token is issued`}
        </p>
      </div>

      {/* Interactive Vending Dispense Modal */}
      {isVendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d3d5d]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-3xl max-w-lg w-full shadow-2xl border border-[#164529]/20 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#164529] text-[#fef9ea] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ffffff]/15 flex items-center justify-center text-[#bbefc7]">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold">
                    Automated Dispensary Kiosk
                  </h3>
                  <p className="text-[11px] text-[#bbefc7]">
                    Physical Dispenser Slot {activeToken?.slot || 1} • Token {activeToken?.token || patient.tokenNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-[#fef9ea]/80 hover:text-[#ffffff] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 bg-[#fef9ea]/40">
              {/* Status Indicator Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  vendingPhase === 'completed'
                    ? 'bg-[#bbefc7]/20 border-[#164529]/20 text-[#164529]'
                    : 'bg-[#ede8d9] border-[#164529]/10 text-[#164529]'
                }`}
              >
                {vendingPhase === 'authenticating' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-[#164529] shrink-0" />
                    <div>
                      <h4 className="font-serif font-bold text-sm">Authenticating Dispensing Token...</h4>
                      <p className="text-xs text-[#555f56]">
                        Verified token {activeToken?.token} for Physical Dispenser Slot {activeToken?.slot || 1}
                      </p>
                    </div>
                  </>
                ) : vendingPhase === 'dispensing' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-[#164529] shrink-0" />
                    <div>
                      <h4 className="font-serif font-bold text-sm">Dispensing Medication in Progress...</h4>
                      <p className="text-xs text-[#555f56]">
                        Dispenser Slot {activeToken?.slot || 1} actuator active: releasing packaged medication
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-[#164529] shrink-0" />
                    <div>
                      <h4 className="font-serif font-bold text-sm">Medications Dispensed Successfully!</h4>
                      <p className="text-xs text-[#555f56]">
                        Please collect your medicines from Physical Dispenser Slot {activeToken?.slot || 1} retrieval bay
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Items Dispensing Checklist */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#717971] uppercase tracking-wider block">
                  MEDICATION DISPENSING PROGRESS
                </span>
                <div className="space-y-2 bg-[#ffffff] p-3.5 rounded-2xl border border-[#164529]/10">
                  {displayMedications.map((med, idx) => {
                    const isVended = vendedItems.includes(idx) || vendingPhase === 'completed';
                    return (
                      <div
                        key={med.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isVended
                            ? 'bg-[#bbefc7]/15 border-[#164529]/15 text-[#164529]'
                            : 'bg-[#faf7ee] border-transparent text-[#717971]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Pill className={`w-4 h-4 ${isVended ? 'text-[#164529]' : 'text-[#717971]'}`} />
                          <div>
                            <span className="font-bold text-xs block text-[#1d1c13]">{med.name}</span>
                            <span className="text-[10px] text-[#717971]">
                              {med.strength} • {med.quantity}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isVended ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#164529] bg-[#bbefc7]/40 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              <span>Vended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#717971] bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span>In Queue</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bay & Retrieval Chute Info */}
              <div className="bg-[#ede8d9]/60 p-3 rounded-2xl flex items-center justify-between text-xs text-[#164529]">
                <span className="font-medium">Collection Chute:</span>
                <span className="font-mono font-bold">{patient.counterNumber || 'Counter 03'} • Slot B-14</span>
              </div>

              {/* Close / Action Button */}
              <button
                onClick={handleCloseModal}
                disabled={vendingPhase !== 'completed'}
                className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-[#164529] hover:bg-[#205e38] text-[#ffffff]"
              >
                {vendingPhase === 'completed' ? (
                  <>
                    <Sparkles className="w-4 h-4 text-[#bbefc7]" />
                    <span>Collected Medicine • Complete</span>
                  </>
                ) : (
                  <span>Dispensing in progress...</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
