import React, { useState, useEffect, useCallback } from 'react';
import { Pharmacist, Prescription, AuditLogEntry } from './types';
import {
  INITIAL_PHARMACISTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_AUDIT_LOGS,
} from './data/mockDispensaryData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { PharmacistLogin } from './components/PharmacistLogin';
import { DispensingBay } from './components/DispensingBay';
import { PrescriptionQueueView } from './components/PrescriptionQueueView';
import { InteractionChecker } from './components/InteractionChecker';
import { TerminalSecurityAudit } from './components/TerminalSecurityAudit';
import { NewPrescriptionModal } from './components/NewPrescriptionModal';
import {
  fetchHospitalPrescriptions,
  subscribeToHospitalPrescriptions,
  updatePrescriptionStatusInSupabase,
  syncDispenseCompletionToSupabase,
} from './utils/supabase';
import { subscribeToPharmacyStatus, ESP32StatusPayload } from './lib/mqttStatusListener';

// Helper to parse route and query params from hash
function parseHash(hash: string) {
  const clean = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = clean.split('?');
  const path = pathPart || '';
  const params = new URLSearchParams(queryPart || '');
  const rx = params.get('rx') || undefined;
  return { path, rx };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPharmacist, setCurrentPharmacist] = useState<Pharmacist>(INITIAL_PHARMACISTS[0]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [selectedRxNumber, setSelectedRxNumber] = useState<string>(
    INITIAL_PRESCRIPTIONS[0]?.rxNumber || ''
  );
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Automated Kiosk Slots State & Realtime MQTT Status
  const [slotStatuses, setSlotStatuses] = useState<
    Record<1 | 2 | 3, { status: 'EMPTY' | 'OCCUPIED'; isAvailable: boolean; token?: string }>
  >({
    1: { status: 'EMPTY', isAvailable: true },
    2: { status: 'EMPTY', isAvailable: true },
    3: { status: 'EMPTY', isAvailable: true },
  });
  const [dispensedAlert, setDispensedAlert] = useState<{
    slot: number;
    token: string;
    timestamp: string;
  } | null>(null);

  const handleUpdateSlotStatus = useCallback(
    (slot: 1 | 2 | 3, status: 'EMPTY' | 'OCCUPIED', isAvailable: boolean, token?: string) => {
      setSlotStatuses((prev) => ({
        ...prev,
        [slot]: { status, isAvailable, token },
      }));
    },
    []
  );

  // Connect to ESP32 / HiveMQ status listener on pharmacy/status
  useEffect(() => {
    const unsubscribe = subscribeToPharmacyStatus(async (payload: ESP32StatusPayload) => {
      const slotNum = (Number(payload.slot) || 1) as 1 | 2 | 3;
      const statusUpper = String(payload.status || '').toUpperCase();

      if ([1, 2, 3].includes(slotNum) && statusUpper === 'EMPTY') {
        // 1. Mark Slot as EMPTY & make it available for the next prescription immediately
        setSlotStatuses((prev) => ({
          ...prev,
          [slotNum]: {
            status: 'EMPTY',
            isAvailable: true,
            token: undefined, // Cleared so slot becomes available for next prescription
          },
        }));

        // 2. Display green "Medicine Dispensed" badge immediately
        setDispensedAlert({
          slot: slotNum,
          token: payload.token,
          timestamp: new Date().toLocaleTimeString(),
        });

        // 3. Mark the prescription for this token / slot as Dispensed immediately in local state (no page reload)
        setPrescriptions((prev) =>
          prev.map((rx) => {
            const rxToken =
              typeof rx.dispenseToken === 'object'
                ? rx.dispenseToken?.token
                : rx.dispenseToken;
            const matchesToken = Boolean(
              payload.token &&
              rxToken &&
              rxToken.trim().toUpperCase() === payload.token.trim().toUpperCase()
            );
            const matchesSlot =
              rx.vendingSlot === `Slot 0${slotNum}` || rx.vendingSlot === `Slot ${slotNum}`;

            if (matchesToken || (matchesSlot && rx.status !== 'Dispensed')) {
              return {
                ...rx,
                status: 'Dispensed',
                verifiedAt: rx.verifiedAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
                dispenseToken:
                  typeof rx.dispenseToken === 'object' && rx.dispenseToken
                    ? {
                        ...rx.dispenseToken,
                        status: 'dispensed',
                        used_at: new Date().toISOString(),
                      }
                    : rx.dispenseToken,
              };
            }
            return rx;
          })
        );

        // 4. Synchronize dispensing completion with Supabase in background (non-polling fire-and-forget)
        try {
          await syncDispenseCompletionToSupabase({
            token: payload.token,
            slot: slotNum,
          });
        } catch (syncErr) {
          console.warn('[MQTT HiveMQ] Background Supabase sync notice:', syncErr);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync route and params from window hash
  useEffect(() => {
    const handleHashChange = () => {
      const { path, rx } = parseHash(window.location.hash);
      if (!isLoggedIn) {
        setCurrentRoute('login');
      } else {
        if (!path || path === 'login') {
          setCurrentRoute('dashboard');
          if (window.location.hash !== '#/dashboard') {
            window.location.hash = '#/dashboard';
          }
        } else {
          setCurrentRoute(path);
        }
      }
      if (rx) {
        setSelectedRxNumber(rx);
      }
    };

    // Initial check on mount or when login status toggles
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn]);

  // Fetch & Subscribe to Supabase prescriptions for current hospital
  useEffect(() => {
    let isMounted = true;

    const loadPrescriptions = async () => {
      const dbList = await fetchHospitalPrescriptions(currentPharmacist.hospitalCode);
      if (isMounted && dbList.length > 0) {
        setPrescriptions((prev) => {
          const dbRxNums = new Set(dbList.map((p) => p.rxNumber));
          const remainingMocks = prev.filter((p) => !dbRxNums.has(p.rxNumber));
          return [...dbList, ...remainingMocks];
        });
        setSelectedRxNumber((curr) => curr || dbList[0].rxNumber);
      }
    };

    loadPrescriptions();

    // Realtime subscription: new patient uploads automatically appear on pharmacist queue
    const unsubscribe = subscribeToHospitalPrescriptions(
      currentPharmacist.hospitalCode,
      (newRx) => {
        if (isMounted) {
          setPrescriptions((prev) => [newRx, ...prev.filter((p) => p.rxNumber !== newRx.rxNumber)]);
          setSelectedRxNumber(newRx.rxNumber);
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
          } catch {}
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentPharmacist.hospitalCode, isLoggedIn]);

  // Navigate with browser history support
  const handleNavigate = useCallback(
    (route: string, rxNumber?: string) => {
      const targetRx = rxNumber || selectedRxNumber;
      if (rxNumber) {
        setSelectedRxNumber(rxNumber);
      }
      setCurrentRoute(route);

      let newHash = `#/${route}`;
      if (
        targetRx &&
        (route === 'prescription-review' ||
          route === 'approved-ready' ||
          route === 'dispensing-monitor' ||
          route === 'dispensing-complete' ||
          route === 'transactions')
      ) {
        newHash += `?rx=${encodeURIComponent(targetRx)}`;
      }

      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    },
    [selectedRxNumber]
  );

  // Natural back button handler with fallback to workflow parent
  const handleBack = useCallback(() => {
    // If browser has history, invoke browser back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback hierarchy based on intended pharmacist workflow
      if (currentRoute === 'transactions') handleNavigate('dashboard');
      else if (
        currentRoute === 'dispensing-complete' ||
        currentRoute === 'dispensing-monitor' ||
        currentRoute === 'approved-ready'
      )
        handleNavigate('dashboard');
      else if (currentRoute === 'prescription-review') handleNavigate('prescriptions');
      else if (currentRoute === 'prescriptions' || currentRoute === 'pending-prescriptions') handleNavigate('dashboard');
      else if (currentRoute === 'interactions') handleNavigate('dashboard');
      else handleNavigate('dashboard');
    }
  }, [currentRoute, handleNavigate]);

  // Login handler
  const handleLoginSuccess = (pharmacist: Pharmacist) => {
    setCurrentPharmacist(pharmacist);
    setIsLoggedIn(true);
    setCurrentRoute('dashboard');
    window.location.hash = '#/dashboard';
  };

  // Lock station / logout handler
  const handleLockTerminal = () => {
    setIsLoggedIn(false);
    setCurrentRoute('login');
    window.location.hash = '#/login';
  };

  // Record audit transaction upon prescription dispense
  const handleRecordTransaction = (rx: Prescription, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      pharmacistId: currentPharmacist.id,
      action: 'FINAL_DISPENSE_SIGNOFF',
      terminalId: currentPharmacist.station,
      details: details,
      securityHash: `${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 6)}`,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Update prescription state
  const handleUpdatePrescription = (updated: Prescription) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.rxNumber === updated.rxNumber ? updated : p))
    );
    updatePrescriptionStatusInSupabase(updated.rxNumber, updated.status);
  };

  // Add intake prescription
  const handleAddPrescription = (newRx: Prescription) => {
    setPrescriptions((prev) => [newRx, ...prev]);
    setSelectedRxNumber(newRx.rxNumber);
    handleNavigate('prescriptions');
  };

  // Count pending prescriptions for badges
  const pendingCount = prescriptions.filter((p) => p.status === 'Pending Review').length;

  return (
    <div className="min-h-screen bg-[#F5F0E1] text-[#1F2F4F] flex flex-col justify-between font-sans selection:bg-[#E9B8C4] selection:text-[#1F2F4F]">
      {/* Universal Top Header */}
      <Header
        currentPharmacist={currentPharmacist}
        onLockTerminal={handleLockTerminal}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isLoggedIn={isLoggedIn}
      />

      {/* Main Workspace Body with Sidebar */}
      <div className="flex-1 flex w-full relative">
        {/* Connected Sidebar Navigation (when logged in) */}
        {isLoggedIn && (
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
            onLogout={handleLockTerminal}
            pendingCount={pendingCount}
            currentPharmacist={currentPharmacist}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 flex flex-col items-center justify-start min-w-0 w-full overflow-x-hidden">
          {!isLoggedIn ? (
            <div className="w-full flex-1 flex items-center justify-center p-4">
              <PharmacistLogin
                onLoginSuccess={handleLoginSuccess}
                onExploreDemo={() => {
                  setIsLoggedIn(true);
                  setCurrentRoute('dashboard');
                  window.location.hash = '#/dashboard';
                }}
              />
            </div>
          ) : (
            <div className="w-full">
              {/* WORKFLOW 1: DASHBOARD (Default view when logged in) */}
              {(currentRoute === 'dashboard' ||
                currentRoute === 'login' ||
                !['prescriptions', 'pending-prescriptions', 'prescription-review', 'dispensing-complete', 'approved-ready', 'dispensing-monitor', 'dispensing', 'transactions', 'audit', 'interactions'].includes(currentRoute)) && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="dashboard"
                  onNavigate={handleNavigate}
                  onRecordTransaction={handleRecordTransaction}
                  slotStatuses={slotStatuses}
                  onUpdateSlotStatus={handleUpdateSlotStatus}
                  dispensedAlert={dispensedAlert}
                  onDismissAlert={() => setDispensedAlert(null)}
                />
              )}

              {/* WORKFLOW 2: PENDING PRESCRIPTIONS QUEUE */}
              {(currentRoute === 'prescriptions' ||
                currentRoute === 'pending-prescriptions') && (
                <PrescriptionQueueView
                  prescriptions={prescriptions}
                  onSelectRx={(rx) => {
                    setSelectedRxNumber(rx.rxNumber);
                    handleNavigate('prescription-review', rx.rxNumber);
                  }}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  onBack={() => handleNavigate('dashboard')}
                  dispensedAlert={dispensedAlert}
                  onDismissAlert={() => setDispensedAlert(null)}
                />
              )}

              {/* WORKFLOW 3: PRESCRIPTION REVIEW */}
              {currentRoute === 'prescription-review' && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="review"
                  targetRxNumber={selectedRxNumber}
                  onNavigate={handleNavigate}
                  onBack={() => handleNavigate('prescriptions')}
                  onRecordTransaction={handleRecordTransaction}
                  slotStatuses={slotStatuses}
                  onUpdateSlotStatus={handleUpdateSlotStatus}
                  dispensedAlert={dispensedAlert}
                  onDismissAlert={() => setDispensedAlert(null)}
                />
              )}

              {/* WORKFLOW: DISPENSING COMPLETE & YET TO VEND (IMAGE 3) */}
              {(currentRoute === 'dispensing-complete' ||
                currentRoute === 'approved-ready' ||
                currentRoute === 'dispensing-monitor' ||
                currentRoute === 'dispensing') && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="dispensing-complete"
                  targetRxNumber={selectedRxNumber}
                  onNavigate={handleNavigate}
                  onBack={() => handleNavigate('dashboard')}
                  onRecordTransaction={handleRecordTransaction}
                  slotStatuses={slotStatuses}
                  onUpdateSlotStatus={handleUpdateSlotStatus}
                  dispensedAlert={dispensedAlert}
                  onDismissAlert={() => setDispensedAlert(null)}
                />
              )}

              {/* WORKFLOW 7: TRANSACTION DETAILS / SECURITY TELEMETRY AUDIT */}
              {(currentRoute === 'transactions' || currentRoute === 'audit') && (
                <TerminalSecurityAudit
                  currentPharmacist={currentPharmacist}
                  logs={auditLogs}
                  highlightRxNumber={selectedRxNumber}
                  onBack={() => handleNavigate('dashboard')}
                />
              )}

              {/* CLINICAL SAFETY & INTERACTION INSPECTOR */}
              {currentRoute === 'interactions' && (
                <InteractionChecker onBack={() => handleNavigate('dashboard')} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Universal Certified EHR Regulatory Footer */}
      <Footer />

      {/* Intake New Prescription Modal */}
      {showNewRxModal && (
        <NewPrescriptionModal
          onClose={() => setShowNewRxModal(false)}
          onAddPrescription={handleAddPrescription}
        />
      )}
    </div>
  );
}
