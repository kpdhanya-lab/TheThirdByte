import React from 'react';
import { ViewMode } from '../types';
import { LOGO_URL } from '../data';
import { ShieldCheck, MapPin, Phone, Clock, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
  onPlayChime: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onPlayChime }) => {
  return (
    <footer className="w-full bg-[#164529] text-[#fef9ea] border-t-4 border-[#ffcdd9] mt-auto">
      {/* Top running decorative strip */}
      <div className="w-full h-1.5 bg-[#ffcdd9]"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#ffffff]/15">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fef9ea] p-1 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src={LOGO_URL}
                  alt="Smart Pharmacy Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <span className="font-serif text-lg font-bold text-[#fef9ea] block leading-tight">
                  Smart Pharmacy
                </span>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#ffcdd9]">
                  BOUTIQUE DISPENSARY
                </span>
              </div>
            </div>

            <p className="text-xs text-[#a2d4ae] leading-relaxed">
              Combining precision AI prescription extraction with trusted, licensed pharmacist
              compounding and patient consultations.
            </p>

            <button
              onClick={onPlayChime}
              className="px-3.5 py-1.5 rounded-full bg-[#2f5d3f] hover:bg-[#3d7050] text-xs font-bold text-[#bbefc7] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Harmonic Chime</span>
              <span className="text-[10px] text-[#ffcdd9]">♪ Active</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#ffcdd9] uppercase tracking-wider">
              Patient Gateway
            </h4>
            <ul className="space-y-2 text-xs text-[#ede8d9]">
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  Patient Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('queue')}
                  className="hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  Live Queue &amp; Pickup Pass
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('upload')}
                  className="hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  Upload Prescription (AI OCR)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('login')}
                  className="hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  Secure OTP Sign-In
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('register')}
                  className="hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  Patient Enrollment
                </button>
              </li>
            </ul>
          </div>

          {/* Dispensary Hours & Location */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#ffcdd9] uppercase tracking-wider">
              Hall &amp; Counter 03
            </h4>
            <div className="space-y-2 text-xs text-[#ede8d9]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#bbefc7] shrink-0 mt-0.5" />
                <span>Dispensary Ground Floor, Counter 03, Metro Medical Arcade</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-[#bbefc7] shrink-0 mt-0.5" />
                <span>Mon – Sat: 08:00 AM – 10:00 PM</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-[#bbefc7] shrink-0 mt-0.5" />
                <span>Desk Hotline: +1 (800) 555-0199</span>
              </div>
            </div>
          </div>

          {/* Clinical Assurance */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#ffcdd9] uppercase tracking-wider">
              Clinical Compliance
            </h4>
            <div className="bg-[#2f5d3f] p-3.5 rounded-2xl space-y-2 text-xs border border-[#ffffff]/10">
              <div className="flex items-center gap-2 text-[#bbefc7] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Licensed Dispensary</span>
              </div>
              <p className="text-[11px] text-[#ede8d9] leading-relaxed">
                Supervised by Dr. Sarah Jenkins, RPh (License #PH-49821). HIPAA &amp; ISO-27001
                confidentiality compliant.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#a2d4ae]">
          <p>© {new Date().getFullYear()} Smart Pharmacy Dispensary Inc. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[11px]">
            <span>Crafted for patient comfort &amp; precision healthcare</span>
            <Heart className="w-3.5 h-3.5 text-[#ffcdd9] fill-[#ffcdd9]" />
          </p>
        </div>
      </div>
    </footer>
  );
};
