import React, { useState } from 'react';
import { ViewMode, PatientProfile, PrescriptionOrder, AttachedDoc } from './types';
import { DEFAULT_PATIENT, SAMPLE_ORDER } from './data';
import { playDispensaryChime } from './utils/audio';
import { Header } from './components/Header';
import { HeroLandingView } from './components/HeroLandingView';
import { LoginView } from './components/LoginView';
import { OtpVerifyView } from './components/OtpVerifyView';
import { RegisterView } from './components/RegisterView';
import { DashboardView } from './components/DashboardView';
import { PrescriptionUploadView } from './components/PrescriptionUploadView';
import { QueueTrackerView } from './components/QueueTrackerView';
import { Modals } from './components/Modals';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [patient, setPatient] = useState<PatientProfile>(DEFAULT_PATIENT);
  const [order, setOrder] = useState<PrescriptionOrder>(SAMPLE_ORDER);
  const [phone, setPhone] = useState('+91 98765 43210');

  // Attached document for prescription upload & AI extraction
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>({
    fileName: 'Metro_Heart_Clinic_Prescription_Thorne.pdf',
    fileSize: '3.8 MB',
    fileType: 'High Resolution Scan',
    uploadTime: 'Today, 10:15 AM',
  });

  // Modal dialog states
  const [counterDirectionsOpen, setCounterDirectionsOpen] = useState(false);
  const [pickupPassOpen, setPickupPassOpen] = useState(false);
  const [pharmacistChatOpen, setPharmacistChatOpen] = useState(false);
  const [docPreviewDoc, setDocPreviewDoc] = useState<AttachedDoc | null>(null);

  // Sound handler
  const handlePlayChime = () => {
    playDispensaryChime();
  };

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendOtp = (enteredPhone: string) => {
    setPhone(enteredPhone);
    handleNavigate('otp');
  };

  const handleVerifiedSuccess = () => {
    handlePlayChime();
    setPatient((prev) => ({ ...prev, phone }));
  };

  const handleRegisteredSuccess = () => {
    handlePlayChime();
  };

  return (
    <div className="min-h-screen bg-[#fef9ea] text-[#1d1c13] flex flex-col selection:bg-[#ffcdd9] selection:text-[#164529]">
      {/* 1. Primary Navigation Bar with mobile menu drawer */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        patientName={patient.name}
        tokenNumber={patient.tokenNumber}
        onOpenNotifications={() => setCounterDirectionsOpen(true)}
        notificationCount={1}
      />

      {/* 3. Main Scrollable Content Canvas */}
      <main className="flex-1 w-full flex flex-col items-center">
        {currentView === 'home' && (
          <HeroLandingView onNavigate={handleNavigate} onPlayChime={handlePlayChime} />
        )}

        {currentView === 'login' && (
          <LoginView
            onNavigate={handleNavigate}
            phone={phone}
            setPhone={setPhone}
            onSendOtp={handleSendOtp}
            patient={patient}
            setPatient={setPatient}
          />
        )}

        {currentView === 'otp' && (
          <OtpVerifyView
            onNavigate={handleNavigate}
            phone={phone}
            patient={patient}
            onVerifiedSuccess={handleVerifiedSuccess}
          />
        )}

        {currentView === 'register' && (
          <RegisterView
            onNavigate={handleNavigate}
            patient={patient}
            setPatient={setPatient}
            onRegistered={handleRegisteredSuccess}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            patient={patient}
            order={order}
            onNavigate={handleNavigate}
            onOpenCounterDirections={() => setCounterDirectionsOpen(true)}
            onOpenPickupPass={() => setPickupPassOpen(true)}
            onOpenPharmacistChat={() => setPharmacistChatOpen(true)}
            onPlayChime={handlePlayChime}
          />
        )}

        {currentView === 'upload' && (
          <PrescriptionUploadView
            attachedDoc={attachedDoc}
            setAttachedDoc={setAttachedDoc}
            onNavigate={handleNavigate}
            onPreviewDoc={(doc) => setDocPreviewDoc(doc)}
          />
        )}

        {currentView === 'queue' && (
          <QueueTrackerView
            patient={patient}
            order={order}
            onNavigate={handleNavigate}
            onOpenPickupPass={() => setPickupPassOpen(true)}
            onOpenPharmacistChat={() => setPharmacistChatOpen(true)}
            onPlayChime={handlePlayChime}
          />
        )}
      </main>

      {/* 5. Modals & Overlay Portals */}
      <Modals
        counterDirectionsOpen={counterDirectionsOpen}
        onCloseCounterDirections={() => setCounterDirectionsOpen(false)}
        pickupPassOpen={pickupPassOpen}
        onClosePickupPass={() => setPickupPassOpen(false)}
        pharmacistChatOpen={pharmacistChatOpen}
        onClosePharmacistChat={() => setPharmacistChatOpen(false)}
        docPreviewDoc={docPreviewDoc}
        onCloseDocPreview={() => setDocPreviewDoc(null)}
        patient={patient}
        order={order}
      />
    </div>
  );
}
