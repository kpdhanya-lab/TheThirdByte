import React, { useState, useEffect } from 'react';
import { ViewMode, PatientProfile, PrescriptionOrder, AttachedDoc, ExtractedPrescription } from './types';
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
import { findPatientByPhone, fetchActiveHospitalCodes } from './utils/supabase';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [patient, setPatient] = useState<PatientProfile>({
    ...DEFAULT_PATIENT,
    verified: false,
  });
  const [order, setOrder] = useState<PrescriptionOrder>(SAMPLE_ORDER);
  const [phone, setPhone] = useState('');

  // Check saved session on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem('active_patient_phone');
    if (savedPhone) {
      findPatientByPhone(savedPhone).then(async (dbPatient) => {
        if (dbPatient) {
          const codes = await fetchActiveHospitalCodes();
          const match = codes.find((c) => c.code === dbPatient.hospital_code);

          setPatient((prev) => ({
            ...prev,
            name: dbPatient.full_name,
            phone: dbPatient.phone,
            age: dbPatient.age,
            language: dbPatient.primary_language || 'English',
            gender: dbPatient.gender,
            address: dbPatient.address,
            email: dbPatient.email || '',
            emergencyContact: dbPatient.emergency_contact || '',
            hospitalCode: dbPatient.hospital_code || '',
            hospitalName: match?.name || (dbPatient.hospital_code ? `Hospital (${dbPatient.hospital_code})` : ''),
            hospitalArea: match?.area || '',
            verified: true,
          }));
          setPhone(dbPatient.phone);
        }
      });
    }
  }, []);

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
    setPatient((prev) => ({ ...prev, phone: phone || prev.phone, verified: true }));
    if (phone) {
      localStorage.setItem('active_patient_phone', phone);
    }
  };

  const handleRegisteredSuccess = () => {
    handlePlayChime();
    setPatient((prev) => ({ ...prev, verified: true }));
  };

  const handleLogout = () => {
    localStorage.removeItem('active_patient_phone');
    setPatient({
      ...DEFAULT_PATIENT,
      verified: false,
    });
    setPhone('');
    handleNavigate('home');
  };

  const handlePrescriptionExtracted = (extracted: ExtractedPrescription) => {
    setAttachedDoc((prev) => (prev ? { ...prev, extractedPrescription: extracted } : null));
    if (extracted.medications && extracted.medications.length > 0) {
      setOrder((prev) => ({
        ...prev,
        doctorName: extracted.prescriber_name || prev.doctorName,
        doctorClinic: extracted.prescriber_clinic || prev.doctorClinic,
        orderDate: extracted.date_written || prev.orderDate,
        medications: extracted.medications.map((m, idx) => ({
          id: `med-${idx + 1}`,
          name: m.medication_name || 'Prescribed Medicine',
          dosage: m.strength || 'As directed',
          form: m.dosage_form || 'Formulation as directed',
          instructions: m.sig || 'Follow directions as written',
          batchNumber: `#RX-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'Compounding & Sealed',
          matchPercent: m.legibility === 'legible' ? 100 : m.legibility === 'partially_legible' ? 75 : 40,
          category: m.dosage_safety_flag === 'review_recommended' ? 'Flagged for Clinical Review' : 'Prescription',
        })),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#fef9ea] text-[#1d1c13] flex flex-col selection:bg-[#ffcdd9] selection:text-[#164529]">
      {/* 1. Primary Navigation Bar with mobile menu drawer */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        patientName={patient.name}
        tokenNumber={patient.tokenNumber}
        hospitalName={patient.hospitalName}
        onOpenNotifications={() => setCounterDirectionsOpen(true)}
        notificationCount={1}
        onLogout={handleLogout}
        isLoggedIn={patient.verified}
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
            onPrescriptionExtracted={handlePrescriptionExtracted}
            patient={patient}
          />
        )}

        {currentView === 'queue' && (
          <QueueTrackerView
            patient={patient}
            order={order}
            extractedPrescription={attachedDoc?.extractedPrescription}
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
