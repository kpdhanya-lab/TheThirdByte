import React, { useState } from 'react';
import { AuditLogEntry, Pharmacist, DispensaryTransaction } from '../types';
import { INITIAL_AUDIT_LOGS, INITIAL_TRANSACTIONS } from '../data/mockDispensaryData';

interface TerminalSecurityAuditProps {
  currentPharmacist: Pharmacist;
  logs?: AuditLogEntry[];
  transactions?: DispensaryTransaction[];
  onBack?: () => void;
  highlightRxNumber?: string;
  initialSelectedTxnId?: string;
}

export const TerminalSecurityAudit: React.FC<TerminalSecurityAuditProps> = ({
  currentPharmacist,
  logs: propLogs,
  transactions: propTransactions,
  onBack,
  highlightRxNumber,
  initialSelectedTxnId,
}) => {
  const transactions: DispensaryTransaction[] = propTransactions || INITIAL_TRANSACTIONS;
  const logs: AuditLogEntry[] = propLogs || INITIAL_AUDIT_LOGS;

  const defaultTxn =
    transactions.find((t) => initialSelectedTxnId && t.id === initialSelectedTxnId) ||
    transactions.find((t) => highlightRxNumber && t.rxNumber === highlightRxNumber) ||
    null;

  const [selectedTxn, setSelectedTxn] = useState<DispensaryTransaction | null>(defaultTxn);
  const [activeTab, setActiveTab] = useState<'transactions' | 'telemetry'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.rxNumber.toLowerCase().includes(term) ||
      t.patientName.toLowerCase().includes(term) ||
      t.medicineName.toLowerCase().includes(term) ||
      t.prescriberName.toLowerCase().includes(term)
    );
  });

  // SCREEN 10: TRANSACTION DETAILS VIEW
  if (selectedTxn) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
        {/* Header with Back button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <button
                onClick={() => setSelectedTxn(null)}
                title="Go back to Transactions List"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Transactions</span>
              </button>
              <span className="text-[10px] font-sans uppercase bg-[#E9B8C4] text-[#1F2F4F] px-2.5 py-0.5 rounded-full font-bold">
                Screen 10: Transaction Details
              </span>
              <span className="text-xs font-mono uppercase text-[#1F2F4F]/60">
                {selectedTxn.id}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
              Transaction Details — {selectedTxn.id}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-[#2F5D3F]/10 text-[#2F5D3F] border border-[#2F5D3F]/20 rounded-full text-xs font-semibold font-mono">
              Status: {selectedTxn.status}
            </span>
          </div>
        </div>

        {/* Main Details Card */}
        <div className="bg-white rounded-2xl border border-[#E5DFCE] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DFCE]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E9B8C4] text-[#1F2F4F] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-[#1F2F4F]/60 font-semibold block">
                  Prescription #{selectedTxn.rxNumber}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2F5D3F]">
                  {selectedTxn.patientName}{' '}
                  <span className="text-sm font-mono text-[#1F2F4F]/60">({selectedTxn.patientId})</span>
                </h2>
              </div>
            </div>

            <div className="bg-[#FAF7EE] px-4 py-2.5 rounded-xl border border-[#E5DFCE] text-right">
              <span className="text-[10px] font-sans uppercase text-[#1F2F4F]/60 block font-semibold">
                Dispense Timestamp
              </span>
              <span className="font-mono text-sm font-bold text-[#2F5D3F]">
                {selectedTxn.time} • {selectedTxn.timestamp.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Core Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-2">
              <span className="text-[10px] font-sans uppercase font-bold text-[#1F2F4F]/60 block">
                Prescribed Medication
              </span>
              <span className="font-serif text-base font-bold text-[#2F5D3F] block">
                {selectedTxn.medicineName}
              </span>
              <div className="text-[#1F2F4F] space-y-1">
                <div>
                  <span className="text-[#1F2F4F]/60">Dosage: </span>
                  <span className="font-semibold font-mono">{selectedTxn.dosage}</span>
                </div>
                <div>
                  <span className="text-[#1F2F4F]/60">Quantity Dispensed: </span>
                  <span className="font-semibold font-mono">{selectedTxn.quantity}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-2">
              <span className="text-[10px] font-sans uppercase font-bold text-[#1F2F4F]/60 block">
                Prescriber & Clinic
              </span>
              <span className="font-semibold text-sm text-[#1F2F4F] block">
                {selectedTxn.prescriberName}
              </span>
              <div className="text-[#1F2F4F]/70 text-[11px] space-y-1">
                <div>Authorized Electronic Prescription (EPCS)</div>
                <div>DEA / State Medical Board Verified</div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-2">
              <span className="text-[10px] font-sans uppercase font-bold text-[#1F2F4F]/60 block">
                Dispensing Station & Pharmacist
              </span>
              <span className="font-semibold text-sm text-[#2F5D3F] block">
                {selectedTxn.pharmacistName}
              </span>
              <div className="text-[#1F2F4F]/70 text-[11px] space-y-1 font-mono">
                <div>Workstation: {selectedTxn.station}</div>
                <div>Verification: Double-Check Certified</div>
              </div>
            </div>
          </div>

          {/* Audit Trail & Cryptographic Security Stamp */}
          <div className="p-4 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFCE]">
              <span className="text-xs font-bold text-[#2F5D3F] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">security</span>
                <span>Audit Trail & Cryptographic Ledger Entry</span>
              </span>
              <span className="text-[10px] font-mono text-[#1F2F4F]/60">
                21 CFR Part 11 Electronic Signature
              </span>
            </div>

            <p className="text-xs text-[#1F2F4F] font-medium leading-relaxed">
              {selectedTxn.details}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[#E5DFCE]/60 text-[11px] font-mono text-[#1F2F4F]/70">
              <div>
                <span className="text-[#1F2F4F]/50 uppercase">Hash: </span>
                <span className="text-[#2F5D3F] font-bold">{selectedTxn.securityHash}</span>
              </div>
              <div>Certified Station Record #{selectedTxn.id}</div>
            </div>
          </div>

          {/* Actions Bottom Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E5DFCE]">
            <button
              onClick={() => setSelectedTxn(null)}
              className="px-4 py-2 rounded-xl bg-white border border-[#E5DFCE] text-[#2F5D3F] text-xs font-semibold hover:bg-[#FAF7EE] cursor-pointer"
            >
              ← Back to All Transactions
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] cursor-pointer shadow-xs"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 9: TRANSACTIONS LIST VIEW
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                title="Go back to Dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Dashboard</span>
              </button>
            )}
            <span className="text-[10px] font-sans uppercase bg-[#E9B8C4] text-[#1F2F4F] px-2.5 py-0.5 rounded-full font-bold">
              Screen 9: Transactions
            </span>
            <span className="text-xs font-sans uppercase text-[#1F2F4F]/60 font-medium">
              Station {currentPharmacist.station} • 21 CFR Part 11
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
            Dispensary Transactions
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white border border-[#E5DFCE] p-1 shadow-xs text-xs font-semibold">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F]/70 hover:text-[#1F2F4F]'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'text-[#1F2F4F]/70 hover:text-[#1F2F4F]'
              }`}
            >
              Security Telemetry
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Telemetry Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E5DFCE] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F2F4F]/60 block">
                Current Workstation
              </span>
              <span className="font-mono text-lg font-bold text-[#2F5D3F] block mt-1">
                {currentPharmacist.station}
              </span>
              <span className="text-[11px] text-[#1F2F4F]/80 block mt-0.5">
                TPM 2.0 Hardware Bound
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5DFCE] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F2F4F]/60 block">
                Cryptographic Cipher
              </span>
              <span className="font-mono text-lg font-bold text-[#2F5D3F] block mt-1">
                HS-256 / AES-256
              </span>
              <span className="text-[11px] text-[#1F2F4F]/80 block mt-0.5">
                TLS 1.3 Strict Forward Secrecy
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5DFCE] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F2F4F]/60 block">
                DEA EPCS Level
              </span>
              <span className="font-mono text-lg font-bold text-[#2F5D3F] block mt-1">
                Level 4 High-Trust
              </span>
              <span className="text-[11px] text-[#1F2F4F]/80 block mt-0.5">
                Dual Biometric Station Token
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5DFCE] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F2F4F]/60 block">
                State PMP Gateway
              </span>
              <span className="font-mono text-lg font-bold text-[#2F5D3F] block mt-1">
                Synchronized (14ms)
              </span>
              <span className="text-[11px] text-[#1F2F4F]/80 block mt-0.5">
                Live Prescription Telemetry
              </span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-[#E5DFCE] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5DFCE] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
                Hardware Audit Logs
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7EE] border-b border-[#E5DFCE] text-[#1F2F4F]/75 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Log ID & Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Terminal</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Security Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFCE]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF7EE]/60">
                      <td className="py-3 px-4 font-mono font-bold text-[#1F2F4F]">
                        {log.id}
                        <span className="block font-normal text-[10px] text-[#1F2F4F]/60">
                          {log.timestamp}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#2F5D3F]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 font-mono">{log.terminalId}</td>
                      <td className="py-3 px-4 text-[#1F2F4F]/85">{log.details}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#1F2F4F]/70">
                        {log.securityHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#1F2F4F]/60">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transaction ID, patient, drug..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5DFCE] rounded-xl focus:outline-none focus:border-[#2F5D3F] text-[#1F2F4F]"
              />
            </div>
            <span className="text-xs text-[#1F2F4F]/60">
              Showing {filteredTransactions.length} recorded dispensary transactions
            </span>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-[#E5DFCE] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7EE] border-b border-[#E5DFCE] text-[#1F2F4F]/75 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Transaction ID</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Prescription No</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Medicine</th>
                    <th className="py-3.5 px-4">Dosage</th>
                    <th className="py-3.5 px-4">Prescriber</th>
                    <th className="py-3.5 px-4">Pharmacist</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFCE]">
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-[#FAF7EE]/60 transition-colors cursor-pointer h-[54px]"
                      onClick={() => setSelectedTxn(t)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#1F2F4F]">
                        {t.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1F2F4F]/80">
                        {t.time}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#2F5D3F]">
                        {t.rxNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-serif font-bold text-[#1F2F4F]">{t.patientName}</span>
                        <span className="text-[10px] text-[#1F2F4F]/60 font-mono block">
                          {t.patientId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1F2F4F]">
                        {t.medicineName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1F2F4F]">
                        {t.dosage}
                      </td>
                      <td className="py-3 px-4 text-[#1F2F4F]/80 text-[11px]">
                        {t.prescriberName}
                      </td>
                      <td className="py-3 px-4 text-[#1F2F4F]/80 text-[11px]">
                        {t.pharmacistName}
                        <span className="block text-[10px] text-[#1F2F4F]/50">{t.station}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#2F5D3F]/10 text-[#2F5D3F]">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(t);
                          }}
                          className="px-3 py-1 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs uppercase tracking-wider"
                        >
                          DETAILS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
