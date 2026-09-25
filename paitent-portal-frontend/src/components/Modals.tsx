import React, { useState } from 'react';
import { AttachedDoc, PatientProfile, PrescriptionOrder } from '../types';
import { X, Navigation, QrCode, Printer, Send, Stethoscope, CheckCircle2, ShieldCheck, Download } from 'lucide-react';

interface ModalsProps {
  counterDirectionsOpen: boolean;
  onCloseCounterDirections: () => void;
  pickupPassOpen: boolean;
  onClosePickupPass: () => void;
  pharmacistChatOpen: boolean;
  onClosePharmacistChat: () => void;
  docPreviewDoc: AttachedDoc | null;
  onCloseDocPreview: () => void;
  patient: PatientProfile;
  order: PrescriptionOrder;
}

export const Modals: React.FC<ModalsProps> = ({
  counterDirectionsOpen,
  onCloseCounterDirections,
  pickupPassOpen,
  onClosePickupPass,
  pharmacistChatOpen,
  onClosePharmacistChat,
  docPreviewDoc,
  onCloseDocPreview,
  patient,
  order,
}) => {
  // Chat state
  const [messages, setMessages] = useState<
    { sender: 'pharmacist' | 'patient'; text: string; time: string }[]
  >([
    {
      sender: 'pharmacist',
      text: `Hello ${patient.name.split(' ')[0]}! I'm Dr. Sarah Jenkins, supervising Counter 03. Your Amoxicillin and Paracetamol are safely verified. Do you have any questions before pickup?`,
      time: '10:35 AM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setMessages((prev) => [
      ...prev,
      { sender: 'patient', text: userMsg, time: 'Just now' },
    ]);
    setChatInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'pharmacist',
          text: `Thank you for your question! For ${order.medications[0].name}, please remember to take it with meals twice daily. When your chime sounds, bring your Token ${patient.tokenNumber} to Counter 03 and I will personally walk you through everything!`,
          time: 'Just now',
        },
      ]);
    }, 1000);
  };

  return (
    <>
      {/* 1. Counter Directions Wayfinding Modal */}
      {counterDirectionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d3d5d]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-[#164529]/20">
            <div className="flex items-center justify-between border-b border-[#ede8d9] pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#164529]" />
                <h4 className="font-serif text-lg text-[#164529] font-bold">
                  Pharmacy Counter 03
                </h4>
              </div>
              <button
                onClick={onCloseCounterDirections}
                className="w-8 h-8 rounded-full bg-[#f3eedf] hover:bg-[#ede8d9] flex items-center justify-center text-[#414942] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[#1d1c13] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#164529]/10 text-[#164529] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Walk towards the <strong>North Bay Entrance</strong> of the dispensary hall.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#164529]/10 text-[#164529] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Look for the illuminated green sign for <strong>Counter 03</strong> situated to
                  the right of the botanical herbal tea bar.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#164529]/10 text-[#164529] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Present your Token <strong className="text-[#164529]">{patient.tokenNumber}</strong>{' '}
                  or digital QR pass to <strong>Sarah Jenkins, Pharmacist</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onCloseCounterDirections}
                className="w-full py-3 bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[44px]"
              >
                Understood, heading over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Official Pickup Pass QR Modal */}
      {pickupPassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d3d5d]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#fef9ea] rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative border-2 border-[#164529]/20 flex flex-col items-center text-center gap-4">
            <button
              onClick={onClosePickupPass}
              className="absolute top-4 right-4 text-[#414942] hover:text-[#164529] p-1 rounded-full hover:bg-[#ede8d9] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#7a545e]">
                SMART PHARMACY BOUTIQUE
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-[#164529] font-bold">
                Express Pickup Pass
              </h3>
            </div>

            {/* QR SVG */}
            <div className="p-4 bg-[#ffffff] rounded-2xl shadow-inner border border-[#164529]/15">
              <svg className="w-48 h-48 text-[#164529]" fill="currentColor" viewBox="0 0 100 100">
                <path d="M0,0 h30 v30 h-30 z M6,6 h18 v18 h-18 z M10,10 h10 v10 h-10 z"></path>
                <path d="M70,0 h30 v30 h-30 z M76,6 h18 v18 h-18 z M80,10 h10 v10 h-10 z"></path>
                <path d="M0,70 h30 v30 h-30 z M6,76 h18 v18 h-18 z M10,80 h10 v10 h-10 z"></path>
                <rect height="24" width="6" x="36" y="6"></rect>
                <rect height="6" width="12" x="48" y="12"></rect>
                <rect height="6" width="18" x="42" y="24"></rect>
                <rect height="6" width="18" x="6" y="36"></rect>
                <rect height="8" width="8" x="36" y="36"></rect>
                <rect height="8" width="16" x="52" y="36"></rect>
                <rect height="6" width="18" x="76" y="36"></rect>
                <rect height="6" width="12" x="12" y="48"></rect>
                <rect height="12" width="12" x="30" y="48"></rect>
                <rect height="6" width="14" x="48" y="48"></rect>
                <rect height="12" width="12" x="68" y="48"></rect>
                <rect height="18" width="8" x="86" y="48"></rect>
                <rect height="6" width="18" x="6" y="60"></rect>
                <rect height="18" width="6" x="42" y="66"></rect>
                <rect height="6" width="12" x="54" y="60"></rect>
                <rect height="6" width="14" x="72" y="66"></rect>
                <rect height="14" width="12" x="36" y="80"></rect>
                <rect height="20" width="8" x="54" y="74"></rect>
                <rect height="12" width="26" x="68" y="82"></rect>
              </svg>
            </div>

            <div>
              <span className="font-sans text-3xl font-bold text-[#164529]">
                {patient.tokenNumber}
              </span>
              <p className="text-xs text-[#1d1c13] font-medium mt-1">
                {patient.name} • Rx #{order.orderId}
              </p>
              <span className="inline-block text-[11px] text-[#7a545e] font-bold bg-[#ffcdd9]/60 px-3 py-1 rounded-full mt-1.5">
                Designated: Counter 03 (Dispensary Hall)
              </span>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-3 rounded-full bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print or Save to Wallet</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Pharmacist Consultation Modal */}
      {pharmacistChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d3d5d]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-3xl max-w-md w-full shadow-2xl border border-[#164529]/20 flex flex-col h-[520px] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#164529] text-[#fef9ea] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={order.pharmacist.avatarUrl}
                  alt={order.pharmacist.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#bbefc7]"
                />
                <div>
                  <h4 className="font-serif text-sm font-bold">{order.pharmacist.name}</h4>
                  <p className="text-[11px] text-[#bbefc7] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#bbefc7] animate-pulse"></span>
                    On Desk • Counter 03
                  </p>
                </div>
              </div>
              <button
                onClick={onClosePharmacistChat}
                className="text-[#fef9ea]/80 hover:text-[#ffffff] p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8f3e4]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'patient' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'patient'
                        ? 'bg-[#164529] text-[#ffffff] rounded-br-none'
                        : 'bg-[#ffffff] text-[#1d1c13] shadow-sm rounded-bl-none border border-[#164529]/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-[#717971] mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Suggested Prompts */}
            <div className="px-3 py-1.5 bg-[#ede8d9] flex gap-1.5 overflow-x-auto text-[11px]">
              {['When to take meds?', 'Any food restrictions?'].map((q) => (
                <button
                  key={q}
                  onClick={() => setChatInput(q)}
                  className="bg-[#ffffff] hover:bg-[#f8f3e4] px-2.5 py-1 rounded-full text-[#164529] font-medium shrink-0 border border-[#164529]/15"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#ffffff] border-t border-[#ede8d9] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Dr. Jenkins about your meds..."
                className="flex-1 bg-[#f8f3e4] text-xs sm:text-sm rounded-full px-4 py-2 border border-[#164529]/20 focus:outline-none focus:border-[#164529]"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Document Preview Modal */}
      {docPreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d3d5d]/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#ffffff] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-[#164529]/20 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#ede8d9] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#7a545e] uppercase tracking-wider">
                  Prescription Document Preview
                </span>
                <h4 className="font-serif text-base text-[#164529] font-bold truncate max-w-xs">
                  {docPreviewDoc.fileName}
                </h4>
              </div>
              <button
                onClick={onCloseDocPreview}
                className="text-[#414942] hover:text-[#164529] p-1 rounded-full hover:bg-[#ede8d9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mock prescription paper styling */}
            <div className="bg-[#fef9ea] p-5 rounded-2xl border border-[#164529]/20 space-y-3 font-serif shadow-inner">
              <div className="flex justify-between items-start border-b border-[#164529]/15 pb-2">
                <div>
                  <h5 className="font-bold text-[#164529] text-base">Metro Heart Clinic &amp; Cardiology</h5>
                  <p className="text-xs text-[#414942] font-sans">Dr. Aris Thorne, MD • Reg #MC-84920</p>
                </div>
                <span className="text-[10px] font-sans font-bold bg-[#164529]/10 text-[#164529] px-2 py-0.5 rounded-full">
                  Verified Rx
                </span>
              </div>

              <div className="text-xs font-sans text-[#1d1c13] space-y-1">
                <p>
                  <strong>Patient:</strong> Eleanor Vance (Age: 34)
                </p>
                <p>
                  <strong>Date:</strong> October 24, 2026
                </p>
              </div>

              <div className="py-2 border-y border-[#164529]/10 text-xs font-sans space-y-2">
                <div className="flex justify-between">
                  <span>1. Amoxicillin Trihydrate 625mg</span>
                  <span className="text-[#164529] font-bold">1 BID x 7 days</span>
                </div>
                <div className="flex justify-between">
                  <span>2. Paracetamol (Acetaminophen) 500mg</span>
                  <span className="text-[#164529] font-bold">PRN pain</span>
                </div>
                <div className="flex justify-between">
                  <span>3. Cetirizine 10mg</span>
                  <span className="text-[#164529] font-bold">1 Nightly</span>
                </div>
              </div>

              <div className="pt-1 flex justify-between items-end">
                <div className="text-[10px] font-sans text-[#717971]">
                  AI Optical Extraction: 100% Match
                </div>
                <div className="text-right">
                  <span className="font-serif italic text-xs text-[#164529]">Dr. Aris Thorne</span>
                  <span className="block text-[9px] font-sans text-[#717971]">Authorized Signature</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onCloseDocPreview}
                className="px-5 py-2.5 rounded-full bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
