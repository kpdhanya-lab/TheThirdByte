import React, { useState } from 'react';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'security' | 'support' | null>(null);

  return (
    <>
      <footer className="w-full py-4 px-6 text-[#1F2F4F]/75 border-t border-[#E5DFCE] bg-[#F5F0E1] text-xs">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-normal text-center sm:text-left text-[12px]">
            © 2026 Smart Pharmacy DISPENSARY. Certified Electronic Health Record (EHR) Module • 21 CFR Part 11 & DEA EPCS.
          </span>
          <div className="flex items-center gap-6 text-[11px] font-medium tracking-wide">
            <button
              onClick={() => setActiveModal('privacy')}
              className="text-[#1F2F4F] hover:text-[#2F5D3F] hover:underline transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveModal('security')}
              className="text-[#1F2F4F] hover:text-[#2F5D3F] hover:underline transition-colors"
            >
              Security Standards
            </button>
            <button
              onClick={() => setActiveModal('support')}
              className="text-[#1F2F4F] hover:text-[#2F5D3F] hover:underline transition-colors"
            >
              Support Desk
            </button>
          </div>
        </div>
      </footer>

      {/* Compliance / Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-[#E5DFCE] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
                  {activeModal === 'privacy' && 'policy'}
                  {activeModal === 'security' && 'verified_user'}
                  {activeModal === 'support' && 'contact_support'}
                </span>
                <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                  {activeModal === 'privacy' && 'Smart Pharmacy Clinical Privacy Policy'}
                  {activeModal === 'security' && 'Smart Pharmacy Certified EHR & EPCS Security'}
                  {activeModal === 'support' && 'Smart Pharmacy Technical Support Desk'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-xl hover:bg-[#F5F0E1] flex items-center justify-center text-[#1F2F4F]/60 hover:text-[#1F2F4F]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 text-xs text-[#1F2F4F] space-y-3 max-h-[60vh] overflow-y-auto leading-relaxed">
              {activeModal === 'privacy' && (
                <>
                  <p>
                    <strong>HIPAA Security & Confidentiality:</strong> Smart Pharmacy strictly enforces 45 CFR Part 160 and Part 164 Subparts A and C. All Protected Health Information (PHI) displayed on dispensary workstations is encrypted at rest using AES-256 and in transit via TLS 1.3 with cryptographic forward secrecy.
                  </p>
                  <p>
                    <strong>Access Audit Trails:</strong> In accordance with HITECH regulations, every pharmacist viewing, verifying, or modifying prescription telemetry generates an indelible audit log entry indexed with station biometric tokens.
                  </p>
                  <p>
                    <strong>Data Segregation:</strong> Prescription records are strictly compartmentalized by institutional pharmacy NPI and authorized clinical dispensaries.
                  </p>
                </>
              )}

              {activeModal === 'security' && (
                <>
                  <p>
                    <strong>DEA EPCS Certification:</strong> Certified under 21 CFR § 1311 for Electronic Prescriptions for Controlled Substances (Schedule II–V). Requires dual-factor cryptographic biometric authentication prior to opening dispensing vaults.
                  </p>
                  <p>
                    <strong>Station Terminal Level 4 Protocol:</strong> Hardware token bound to MAC/TPM chip. HMAC-SHA256 authenticated sessions expire after 15 minutes of idle workstation telemetry.
                  </p>
                  <p>
                    <strong>NDC & Barcode Verification:</strong> Two-way match required between primary package barcode scanning (GS1 Databar) and state-mandated prescription formulary codes.
                  </p>
                </>
              )}

              {activeModal === 'support' && (
                <>
                  <p>
                    <strong>Emergency Dispensary Hotlines:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Pharmacy Informatics Helpdesk: Ext. 4402 / (800) 555-SMART</li>
                    <li>Controlled Substance Vault Lockout: Ext. 9110 (24/7 Rapid Response)</li>
                    <li>State PMP Gateway Sync: Status ONLINE (Latency: 14ms)</li>
                  </ul>
                  <p className="pt-2">
                    System: <code className="bg-[#FAF7EE] px-2 py-0.5 rounded-lg text-[#2F5D3F] font-mono border border-[#E5DFCE]">SMART-DISP-BAY</code> • Build: v2.4-STITCH
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5DFCE] flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] transition-colors shadow-xs"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
