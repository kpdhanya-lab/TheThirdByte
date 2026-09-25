import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile, ViewMode } from '../types';
import { CAPSULE_IMG_URL } from '../data';
import { ArrowRight, ShieldCheck, Hourglass, CheckCircle2, MapPin } from 'lucide-react';

interface OtpVerifyViewProps {
  onNavigate: (view: ViewMode) => void;
  phone: string;
  onVerifiedSuccess: () => void;
  patient?: PatientProfile;
}

export const OtpVerifyView: React.FC<OtpVerifyViewProps> = ({
  onNavigate,
  phone,
  onVerifiedSuccess,
  patient,
}) => {
  const [digits, setDigits] = useState(['8', '4', '2', '9', '1', '']);
  const [timeLeft, setTimeLeft] = useState(26);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      setTimeout(() => {
        onVerifiedSuccess();
        onNavigate('dashboard');
      }, 700);
    }, 800);
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="w-full relative overflow-hidden bg-[#f8f3e4] rounded-3xl shadow-xl border border-[#164529]/15 p-6 sm:p-8 flex flex-col items-center">
        {/* Awning stripe ribbon */}
        <div className="w-full h-2 rounded-full overflow-hidden flex mb-6 shadow-inner">
          <div className="h-full w-1/6 bg-[#164529]"></div>
          <div className="h-full w-1/6 bg-[#ffcdd9]"></div>
          <div className="h-full w-1/6 bg-[#164529]"></div>
          <div className="h-full w-1/6 bg-[#ffcdd9]"></div>
          <div className="h-full w-1/6 bg-[#164529]"></div>
          <div className="h-full w-1/6 bg-[#ffcdd9]"></div>
        </div>

        {/* Circular Apothecary Capsule Stamp */}
        <div className="relative w-24 h-36 sm:w-28 sm:h-44 mb-5 flex items-center justify-center overflow-hidden rounded-full shadow-md border-2 border-[#ffffff]">
          <img
            src={CAPSULE_IMG_URL}
            alt="Medicine Capsule"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl sm:text-3xl text-center text-[#1d1c13] mb-1 font-semibold">
          Verify Your <span className="italic text-[#164529] font-serif font-normal">Identity</span>
        </h1>
        <p className="text-xs sm:text-sm text-center text-[#414942] max-w-xs mb-4 leading-relaxed">
          We sent a 6-digit OTP security code via SMS to{' '}
          <span className="font-bold text-[#164529] block sm:inline">
            {phone || '+91 98765 43210'}
          </span>
        </p>

        {patient?.hospitalName && (
          <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ede8d9] text-[#164529] text-xs font-semibold border border-[#164529]/15 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-[#164529] shrink-0" />
            <span>
              {patient.hospitalName}
              {patient.hospitalArea ? `, ${patient.hospitalArea}` : ''}
              {patient.hospitalCode ? ` (${patient.hospitalCode})` : patient.hospitalPin ? ` (${patient.hospitalPin})` : ''}
            </span>
          </div>
        )}

        {/* 6 OTP Input Boxes */}
        <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full mb-6">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                placeholder={idx === 5 ? '•' : ''}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center font-sans font-bold text-xl rounded-xl bg-[#ffffff] text-[#164529] border border-[#164529]/20 shadow-sm focus:border-[#164529] focus:ring-2 focus:ring-[#164529]/20 focus:outline-none transition-all"
                autoFocus={idx === 5}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || verified}
            className="w-full bg-[#164529] hover:bg-[#2f5d3f] active:scale-[0.98] text-[#ffffff] py-4 px-6 rounded-full text-xs font-bold tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Authenticating...
              </span>
            ) : verified ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#ffcdd9]" />
                Identity Verified!
              </span>
            ) : (
              <>
                <span>VERIFY &amp; CONTINUE TO DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Timer & Resend Options */}
        <div className="mt-6 flex flex-col items-center gap-2 w-full text-xs">
          <div className="flex items-center gap-1.5 text-[#414942]">
            <Hourglass className="w-3.5 h-3.5 text-[#164529]" />
            <span>Resend OTP in</span>
            {timeLeft > 0 ? (
              <span className="font-bold text-[#164529] tracking-wider">
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
              </span>
            ) : (
              <button
                onClick={() => setTimeLeft(30)}
                className="underline font-bold text-[#164529] cursor-pointer"
              >
                Resend Code Now
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[#414942]">
            <span>Entered the wrong mobile number?</span>
            <button
              onClick={() => onNavigate('login')}
              className="text-[#164529] font-bold underline underline-offset-2 hover:text-[#2f5d3f] cursor-pointer"
            >
              Change number
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full my-6 h-px bg-[#164529]/10"></div>

        {/* Security Notice */}
        <div className="w-full bg-[#ede8d9] rounded-2xl p-3.5 flex items-start gap-3 border border-[#164529]/10">
          <ShieldCheck className="w-5 h-5 text-[#7a545e] shrink-0 mt-0.5" />
          <p className="text-xs text-[#414942] leading-relaxed">
            <strong className="text-[#1d1c13] font-semibold">Security Notice:</strong> Smart
            Pharmacy will never ask for your card details, passwords, or PIN numbers over SMS or
            phone call.
          </p>
        </div>
      </div>
    </div>
  );
};
