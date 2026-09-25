import React from 'react';
import { ViewMode } from '../types';
import { CAPSULE_IMG_URL } from '../data';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroLandingViewProps {
  onNavigate: (view: ViewMode) => void;
  onPlayChime: () => void;
}

export const HeroLandingView: React.FC<HeroLandingViewProps> = ({ onNavigate, onPlayChime }) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Ambient Botanical Glow */}
        <div className="absolute top-10 -right-20 w-80 h-80 rounded-full bg-[#ffcdd9]/20 pointer-events-none blur-3xl"></div>
        <div className="absolute bottom-10 -left-20 w-96 h-96 rounded-full bg-[#164529]/10 pointer-events-none blur-3xl"></div>

        {/* Capsule Emblem Showcase */}
        <div className="relative mb-5">
          <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-full p-1 bg-[#ffffff] shadow-md border border-[#164529]/15 flex items-center justify-center overflow-hidden">
            <img
              src={CAPSULE_IMG_URL}
              alt="Medical Apothecary Capsule"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 bg-[#164529] text-[#fef9ea] p-1.5 rounded-full shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#bbefc7]" />
          </span>
        </div>

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#164529]/20 bg-[#ffffff]/60 backdrop-blur-xs shadow-xs mb-6">
          <span className="w-2 h-2 rounded-full bg-[#2f5d3f]"></span>
          <span className="text-[11px] font-bold text-[#164529] tracking-[0.2em] uppercase">
            ABOUT SMART PHARMACY
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="font-serif text-3xl sm:text-5xl lg:text-[54px] text-[#1d1c13] tracking-tight leading-[1.14] mb-5 max-w-3xl">
          Skip the Pharmacy Queue. Track Your Medicines{' '}
          <span className="italic text-[#164529] font-serif font-normal">Smarter.</span>
        </h1>

        {/* Subtitle Description */}
        <p className="text-base sm:text-lg text-[#414942] font-normal leading-relaxed max-w-2xl mb-8">
          Smart Pharmacy lets you upload your prescription online and follow its progress in real
          time. AI helps read your prescription, and a licensed pharmacist verifies every medicine
          before it is prepared.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
          <button
            onClick={() => onNavigate('register')}
            className="w-full sm:w-auto flex-1 min-h-[50px] px-8 py-3.5 rounded-full bg-[#164529] text-[#ffffff] font-bold text-xs uppercase tracking-wider hover:bg-[#235837] active:scale-[0.98] transition-all shadow-[0_6px_20px_rgba(22,69,41,0.2)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>REGISTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto flex-1 min-h-[50px] px-8 py-3.5 rounded-full bg-[#ffd9e1] text-[#1d1c13] font-bold text-xs uppercase tracking-wider hover:bg-[#ffcdd9] active:scale-[0.98] transition-all shadow-xs flex items-center justify-center cursor-pointer"
          >
            <span>LOGIN</span>
          </button>
        </div>
      </section>
    </div>
  );
};
