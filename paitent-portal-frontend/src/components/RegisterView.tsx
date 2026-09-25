import React, { useState } from 'react';
import { PatientProfile, ViewMode } from '../types';
import { CAPSULE_IMG_URL } from '../data';
import {
  ArrowRight,
  User,
  Phone,
  Home,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  HospitalCodeInput,
  VALID_HOSPITAL_CODES,
  findHospitalByCode,
  HospitalEntry,
} from './HospitalCodeInput';

export { VALID_HOSPITAL_CODES };
export type { HospitalEntry };

interface RegisterViewProps {
  onNavigate: (view: ViewMode) => void;
  patient: PatientProfile;
  setPatient: React.Dispatch<React.SetStateAction<PatientProfile>>;
  onRegistered: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onNavigate,
  patient,
  setPatient,
  onRegistered,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [hospitalCodeInput, setHospitalCodeInput] = useState(patient.hospitalCode || '');
  const [hospitalCodeError, setHospitalCodeError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      const matched = findHospitalByCode(hospitalCodeInput);
      if (!matched) {
        setHospitalCodeError('Invalid hospital code. Please check the code with your hospital.');
        return;
      }
      setHospitalCodeError('');
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onRegistered();
        onNavigate('dashboard');
      }, 700);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-6 sm:py-12 px-4 sm:px-6">
      {/* Running Marquee Header */}
      <div className="w-full bg-[#ede8d9] overflow-hidden py-1.5 px-4 mb-6 rounded-full border border-[#164529]/10">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#414942] font-bold">
          <span>SMART PHARMACY</span>
          <span className="text-[#164529]">■</span>
          <span>PATIENT ENROLLMENT</span>
          <span className="text-[#164529] hidden sm:inline">■</span>
          <span className="hidden sm:inline">EASY PICKUP</span>
          <span className="text-[#164529]">■</span>
          <span>SECURE GATEWAY</span>
        </div>
      </div>

      {/* Emblem Stamp */}
      <div className="flex justify-center -mb-8 relative z-10">
        <div className="w-20 h-20 rounded-full bg-[#ffffff] flex items-center justify-center p-1 shadow-lg border-2 border-[#164529]">
          <img
            src={CAPSULE_IMG_URL}
            alt="Apothecary Emblem"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="w-full bg-[#f8f3e4] pt-12 pb-8 px-6 sm:px-8 rounded-3xl shadow-xl border border-[#164529]/15">
        <div className="text-center space-y-1 mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl text-[#164529] font-bold tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-[#414942] max-w-sm mx-auto leading-relaxed">
            Register in 60 seconds to upload prescriptions and track your queue status live.
          </p>
        </div>

        {/* Stepper Navigation Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 bg-[#ede8d9] p-1 rounded-2xl sm:rounded-full w-full max-w-md mx-auto border border-[#164529]/10">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              step === 1
                ? 'bg-[#164529] text-[#fef9ea] shadow-sm'
                : 'text-[#414942] hover:text-[#164529]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 1 ? 'bg-[#ffcdd9] text-[#164529]' : 'bg-[#164529]/15 text-[#164529]'
              }`}
            >
              1
            </span>
            <span>Personal Details</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              step === 2
                ? 'bg-[#164529] text-[#fef9ea] shadow-sm'
                : 'text-[#414942] hover:text-[#164529]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 2 ? 'bg-[#ffcdd9] text-[#164529]' : 'bg-[#164529]/15 text-[#164529]'
              }`}
            >
              2
            </span>
            <span>Contact Details</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              step === 3
                ? 'bg-[#164529] text-[#fef9ea] shadow-sm'
                : 'text-[#414942] hover:text-[#164529]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3 ? 'bg-[#ffcdd9] text-[#164529]' : 'bg-[#164529]/15 text-[#164529]'
              }`}
            >
              3
            </span>
            <span>Select Your Location</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                  Patient Full Name <span className="text-[#7a545e]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={patient.name}
                    onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-3 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm placeholder:text-[#c1c9c0]"
                  />
                  <User className="w-4 h-4 absolute right-3.5 top-3.5 text-[#717971]" />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                  Mobile Number (for SMS &amp; OTP) <span className="text-[#7a545e]">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="bg-[#ede8d9] text-[#1d1c13] text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center shadow-sm select-none border border-[#164529]/15">
                    +91
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      value={patient.phone.replace('+91 ', '')}
                      onChange={(e) =>
                        setPatient({ ...patient, phone: `+91 ${e.target.value.trim()}` })
                      }
                      placeholder="98765 43210"
                      className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-3 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm placeholder:text-[#c1c9c0]"
                    />
                    <Phone className="w-4 h-4 absolute right-3.5 top-3.5 text-[#717971]" />
                  </div>
                </div>
              </div>

              {/* Age & Primary Language */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                    Age <span className="text-[#7a545e]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={patient.age}
                    onChange={(e) =>
                      setPatient({ ...patient, age: parseInt(e.target.value, 10) || 18 })
                    }
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-3 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                    Primary Language
                  </label>
                  <select
                    value={patient.language}
                    onChange={(e) => setPatient({ ...patient, language: e.target.value })}
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-3 py-3 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Gender Designation */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                  Gender Designation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Female', 'Male', 'Non-binary', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPatient({ ...patient, gender: g })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        patient.gender === g
                          ? 'bg-[#164529] text-[#ffffff] border-[#164529] shadow-sm'
                          : 'bg-[#ffffff] text-[#414942] border-[#164529]/15 hover:bg-[#ede8d9]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                  Residential Address (For Delivery &amp; Verification)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={patient.address}
                    onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                    placeholder="e.g. 42 Kensington Mews, Flat B, New Delhi"
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-2.5 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm placeholder:text-[#c1c9c0] resize-none"
                  />
                  <Home className="w-4 h-4 absolute right-3.5 top-3 text-[#717971]" />
                </div>
              </div>

              {/* Email & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                    Email <span className="text-[10px] text-[#717971]">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={patient.email || ''}
                    onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                    placeholder="eleanor@apothecary.com"
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-2.5 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#164529] uppercase tracking-wider">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={patient.emergencyContact || ''}
                    onChange={(e) => setPatient({ ...patient, emergencyContact: e.target.value })}
                    placeholder="Marcus Vance (+91...)"
                    className="w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-2.5 border border-[#164529]/20 focus:border-[#164529] focus:outline-none shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in duration-200">
              <HospitalCodeInput
                value={hospitalCodeInput}
                onChange={handleHospitalCodeChange}
                error={hospitalCodeError}
                onBlur={handleHospitalCodeBlur}
                id="register-hospital-code"
              />
            </div>
          )}

          {/* Privacy & Security Badge */}
          <div className="bg-[#ede8d9] p-3 rounded-2xl flex items-center gap-3 border border-[#164529]/10 mt-4">
            <ShieldCheck className="w-5 h-5 text-[#164529] shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-[#164529] block">Private &amp; Secure</span>
              <span className="text-[#414942]">
                Your personal and health information is kept strictly confidential.
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 space-y-3">
            {step === 1 && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-full bg-[#164529] hover:bg-[#2f5d3f] active:scale-[0.99] text-[#ffffff] text-xs font-bold tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
              >
                <span>CONTINUE TO CONTACT DETAILS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-4 px-5 rounded-full bg-[#ede8d9] hover:bg-[#e2dcce] active:scale-[0.99] text-[#164529] text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center cursor-pointer border border-[#164529]/15 shrink-0"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 px-6 rounded-full bg-[#164529] hover:bg-[#2f5d3f] active:scale-[0.99] text-[#ffffff] text-xs font-bold tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
                >
                  <span>CONTINUE TO SELECT LOCATION</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-4 px-5 rounded-full bg-[#ede8d9] hover:bg-[#e2dcce] active:scale-[0.99] text-[#164529] text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center cursor-pointer border border-[#164529]/15 shrink-0"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 px-6 rounded-full bg-[#164529] hover:bg-[#2f5d3f] active:scale-[0.99] text-[#ffffff] text-xs font-bold tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enrolling Patient...
                    </span>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT &amp; GO TO DASHBOARD</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 px-1">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[#7a545e] hover:text-[#164529] transition-colors underline underline-offset-4 cursor-pointer font-semibold"
                >
                  Preview Step 2 Fields
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#7a545e] hover:text-[#164529] transition-colors underline underline-offset-4 cursor-pointer font-semibold"
                >
                  Back to Personal Details
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[#7a545e] hover:text-[#164529] transition-colors underline underline-offset-4 cursor-pointer font-semibold"
                >
                  Back to Contact Details
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-[#164529] font-bold hover:underline cursor-pointer"
              >
                Already registered? <span className="underline">Login OTP</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
