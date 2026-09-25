import React, { useState } from 'react';
import { PatientProfile, ViewMode } from '../types';
import { ArrowRight, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import {
  HospitalCodeInput,
  findHospitalByCode,
  HospitalEntry,
} from './HospitalCodeInput';
import { findPatientByPhone } from '../utils/supabase';

interface LoginViewProps {
  onNavigate: (view: ViewMode) => void;
  phone: string;
  setPhone: (val: string) => void;
  onSendOtp: (phone: string) => void;
  patient: PatientProfile;
  setPatient: React.Dispatch<React.SetStateAction<PatientProfile>>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  phone,
  setPhone,
  onSendOtp,
  patient,
  setPatient,
}) => {
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [hospitalCodeInput, setHospitalCodeInput] = useState(patient.hospitalCode || '');
  const [hospitalCodeError, setHospitalCodeError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const handleHospitalCodeChange = (code: string, matched: HospitalEntry | undefined) => {
    setHospitalCodeInput(code);
    if (hospitalCodeError) {
      setHospitalCodeError('');
    }
    if (matched) {
      setPatient((prev) => ({
        ...prev,
        hospitalCode: matched.code,
        hospitalName: matched.name,
        hospitalArea: matched.area,
      }));
    } else {
      setPatient((prev) => ({
        ...prev,
        hospitalCode: code,
        hospitalName: '',
        hospitalArea: '',
      }));
    }
  };

  const handleHospitalCodeBlur = () => {
    if (hospitalCodeInput.trim().length > 0 && !findHospitalByCode(hospitalCodeInput)) {
      setHospitalCodeError('Invalid hospital code. Please check the code with your hospital.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    let hasError = false;

    const rawDigits = phone.replace(/\D/g, '');
    if (!phone || rawDigits.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      hasError = true;
    } else {
      setPhoneError('');
    }

    const matched = findHospitalByCode(hospitalCodeInput);
    if (!matched) {
      setHospitalCodeError('Invalid hospital code. Accepted codes: 560017, 560076, 560034');
      hasError = true;
    } else {
      setHospitalCodeError('');
    }

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      // Check database to ensure ONLY registered mobile numbers can login
      const registeredPatient = await findPatientByPhone(phone);

      if (!registeredPatient) {
        setPhoneError('This mobile number is not registered. Please register first to access the portal.');
        setLoading(false);
        return;
      }

      // Populate patient state with registered details
      setPatient((prev) => ({
        ...prev,
        name: registeredPatient.full_name,
        phone: registeredPatient.phone,
        age: registeredPatient.age,
        gender: registeredPatient.gender,
        address: registeredPatient.address,
        language: registeredPatient.primary_language || 'English',
        email: registeredPatient.email || '',
        emergencyContact: registeredPatient.emergency_contact || '',
        hospitalCode: matched!.code,
        hospitalName: matched!.name,
        hospitalArea: matched!.area,
        verified: false,
      }));

      onSendOtp(registeredPatient.phone);
    } catch (err: any) {
      setGeneralError(err?.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 sm:py-14 px-4 sm:px-6">
      {/* Ticker strip */}
      <div className="w-full overflow-hidden bg-[#ede8d9] py-1.5 px-4 rounded-full mb-6 border border-[#164529]/10">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#414942] font-bold">
          <span>SMART PHARMACY</span>
          <span className="text-[#164529]">■</span>
          <span>PATIENT ACCESS</span>
          <span className="text-[#164529]">■</span>
          <span>SECURE OTP DISPATCH</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-[#ffffff] rounded-3xl shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between border border-[#164529]/15">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#ede8d9] text-[#164529] text-[11px] font-bold uppercase tracking-wider">
              PATIENT PORTAL
            </span>
            <span className="text-xs text-[#7a545e] font-semibold">Step 1 of 2</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-[#1d1c13] tracking-tight">
            Welcome <span className="font-serif italic font-normal text-[#7a545e]">Back</span>
          </h1>
          <p className="mt-2 text-sm text-[#414942] leading-relaxed">
            Enter your registered mobile number to receive a secure instant one-time passcode.
          </p>

          {generalError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="patient-phone"
                className="block text-xs font-bold text-[#164529] uppercase tracking-wider mb-2"
              >
                Mobile Contact Number <span className="text-[#7a545e]">*</span>
              </label>
              <div className="relative flex items-center rounded-2xl bg-[#f8f3e4] border border-[#164529]/20 focus-within:border-[#164529] focus-within:ring-2 focus-within:ring-[#164529]/20 transition-all p-1.5">
                {/* Country Prefix */}
                <div className="flex items-center gap-1 pl-3 pr-2 py-2 bg-[#ede8d9] rounded-xl text-xs font-bold text-[#1d1c13] select-none">
                  <span>IN</span>
                  <span className="text-[#414942] font-normal">+91</span>
                </div>

                {/* Input */}
                <input
                  id="patient-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="98765 43210"
                  className="w-full bg-transparent px-4 py-2 text-base text-[#1d1c13] font-medium tracking-wider placeholder:text-[#c1c9c0] focus:outline-none"
                  autoFocus
                />

                <div className="pr-3 text-[#164529]">
                  <Phone className="w-5 h-5 opacity-70" />
                </div>
              </div>

              {phoneError && (
                <div className="mt-2 text-xs text-[#ba1a1a] font-semibold flex items-center justify-between">
                  <span>{phoneError}</span>
                  {phoneError.includes('not registered') && (
                    <button
                      type="button"
                      onClick={() => onNavigate('register')}
                      className="underline text-[#164529] font-bold hover:opacity-80 ml-2"
                    >
                      Register Now
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mt-2 px-1 text-xs">
                <span className="text-[#717971]">Registered 10-digit mobile line</span>
                <span className="text-[#7a545e] font-semibold">SMS Dispatch Active</span>
              </div>
            </div>

            {/* Hospital Code Input */}
            <HospitalCodeInput
              value={hospitalCodeInput}
              onChange={handleHospitalCodeChange}
              error={hospitalCodeError}
              onBlur={handleHospitalCodeBlur}
              id="login-hospital-code"
            />

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-full bg-[#164529] hover:bg-[#2f5d3f] active:scale-[0.99] text-[#ffffff] text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-75 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#ffffff] border-t-transparent rounded-full animate-spin"></span>
                  Checking Patient Record...
                </span>
              ) : (
                <>
                  <span>SEND OTP CODE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Card Section */}
        <div className="mt-8 pt-6 border-t border-[#164529]/10 space-y-4">
          <p className="text-center text-xs sm:text-sm text-[#414942]">
            New to Smart Pharmacy?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-[#164529] font-bold hover:underline underline-offset-4 ml-1 cursor-pointer"
            >
              Register for patient record
            </button>
          </p>

          <div className="p-3 rounded-xl bg-[#f8f3e4] flex items-center justify-between border border-[#164529]/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#164529]" />
              <span className="text-xs text-[#1d1c13] font-semibold">Fast &amp; Secure Login</span>
            </div>
            <span className="text-[11px] text-[#7a545e] font-bold">256-BIT ENCRYPTION</span>
          </div>
        </div>
      </div>
    </div>
  );
};
