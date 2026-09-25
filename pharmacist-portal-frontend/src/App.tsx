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

  // Sync route and params from window hash
  useEffect(() => {
    const handleHashChange = () => {
      const { path, rx } = parseHash(window.location.hash);
      if (!path) {
        // Default route
        setCurrentRoute(isLoggedIn ? 'dashboard' : 'login');
      } else {
        setCurrentRoute(path);
      }
      if (rx) {
        setSelectedRxNumber(rx);
      }
    };

    // Initial check on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn]);

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
      else if (currentRoute === 'dispensing-complete') handleNavigate('dispensing-monitor', selectedRxNumber);
      else if (currentRoute === 'dispensing-monitor') handleNavigate('approved-ready', selectedRxNumber);
      else if (currentRoute === 'approved-ready') handleNavigate('prescription-review', selectedRxNumber);
      else if (currentRoute === 'prescription-review') handleNavigate('prescriptions');
      else if (currentRoute === 'prescriptions' || currentRoute === 'pending-prescriptions') handleNavigate('dashboard');
      else if (currentRoute === 'interactions') handleNavigate('dashboard');
      else handleNavigate('dashboard');
    }
  }, [currentRoute, handleNavigate, selectedRxNumber]);

  // Login handler
  const handleLoginSuccess = (pharmacist: Pharmacist) => {
    setCurrentPharmacist(pharmacist);
    setIsLoggedIn(true);
    handleNavigate('dashboard');
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
                  handleNavigate('dashboard');
                }}
              />
            </div>
          ) : (
            <div className="w-full">
              {/* WORKFLOW 1: DASHBOARD */}
              {currentRoute === 'dashboard' && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="dashboard"
                  onNavigate={handleNavigate}
                  onRecordTransaction={handleRecordTransaction}
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
                />
              )}

              {/* WORKFLOW 4: APPROVED / READY FOR DISPENSE */}
              {currentRoute === 'approved-ready' && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="ready"
                  targetRxNumber={selectedRxNumber}
                  onNavigate={handleNavigate}
                  onBack={() => handleNavigate('prescription-review', selectedRxNumber)}
                  onRecordTransaction={handleRecordTransaction}
                />
              )}

              {/* WORKFLOW 5: DISPENSING MONITOR */}
              {(currentRoute === 'dispensing-monitor' ||
                currentRoute === 'dispensing') && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="dispensing-monitor"
                  targetRxNumber={selectedRxNumber}
                  onNavigate={handleNavigate}
                  onBack={() => handleNavigate('approved-ready', selectedRxNumber)}
                  onRecordTransaction={handleRecordTransaction}
                />
              )}

              {/* WORKFLOW 6: DISPENSING COMPLETE */}
              {currentRoute === 'dispensing-complete' && (
                <DispensingBay
                  prescriptions={prescriptions}
                  currentPharmacist={currentPharmacist}
                  onUpdatePrescription={handleUpdatePrescription}
                  onOpenNewRxModal={() => setShowNewRxModal(true)}
                  workflowStep="dispensing-complete"
                  targetRxNumber={selectedRxNumber}
                  onNavigate={handleNavigate}
                  onBack={() => handleNavigate('dispensing-monitor', selectedRxNumber)}
                  onRecordTransaction={handleRecordTransaction}
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
