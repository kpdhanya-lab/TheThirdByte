import React, { useState } from 'react';
import { Prescription } from '../types';

interface PrescriptionQueueViewProps {
  prescriptions: Prescription[];
  onSelectRx: (rx: Prescription) => void;
  onOpenNewRxModal: () => void;
  onBack?: () => void;
}

export const PrescriptionQueueView: React.FC<PrescriptionQueueViewProps> = ({
  prescriptions,
  onSelectRx,
  onOpenNewRxModal,
  onBack,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'Pending Review' | 'Ready for Dispense' | 'Dispensed' | 'STAT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = prescriptions.filter((rx) => {
    const matchesFilter =
      activeFilter === 'ALL'
        ? true
        : activeFilter === 'STAT'
        ? rx.priority === 'STAT'
        : rx.status === activeFilter;

    const matchesSearch =
      rx.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.rxNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.prescriber.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                title="Go back to Dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Dashboard</span>
              </button>
            )}
            <span className="text-[10px] font-sans uppercase bg-[#E9B8C4] text-[#1F2F4F] px-2.5 py-0.5 rounded-full font-bold">
              Pending Prescriptions
            </span>
            <span className="text-xs font-sans uppercase text-[#1F2F4F]/60 font-medium">
              Smart Pharmacy Dispensary Queue
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
            Prescription Master Queue
          </h1>
        </div>
        <button
          onClick={onOpenNewRxModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New e-Prescription Order</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            { label: 'All Orders', value: 'ALL', count: prescriptions.length },
            { label: 'Pending Review', value: 'Pending Review', count: prescriptions.filter(p => p.status === 'Pending Review').length },
            { label: 'STAT Priority', value: 'STAT', count: prescriptions.filter(p => p.priority === 'STAT').length },
            { label: 'Ready for Dispense', value: 'Ready for Dispense', count: prescriptions.filter(p => p.status === 'Ready for Dispense').length },
            { label: 'Dispensed', value: 'Dispensed', count: prescriptions.filter(p => p.status === 'Dispensed').length },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveFilter(item.value as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === item.value
                  ? 'bg-[#2F5D3F] text-white shadow-xs'
                  : 'bg-white hover:bg-[#FAF7EE] text-[#1F2F4F] border border-[#E5DFCE]'
              }`}
            >
              <span>{item.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === item.value ? 'bg-white/20 text-white' : 'bg-[#FAF7EE] text-[#1F2F4F]/70'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#1F2F4F]/60">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, drug, Rx#..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5DFCE] rounded-xl focus:outline-none focus:border-[#2F5D3F] text-[#1F2F4F]"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="mt-4 bg-white rounded-2xl border border-[#E5DFCE] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF7EE] border-b border-[#E5DFCE] text-[#1F2F4F]/75 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Patient Name</th>
                <th className="py-3.5 px-4 font-semibold">Patient ID</th>
                <th className="py-3.5 px-4 font-semibold">Prescription No</th>
                <th className="py-3.5 px-4 font-semibold">Medicine</th>
                <th className="py-3.5 px-4 font-semibold">Dosage</th>
                <th className="py-3.5 px-4 font-semibold">Time</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DFCE]">
              {filtered.map((rx) => (
                <tr
                  key={rx.rxNumber}
                  onClick={() => onSelectRx(rx)}
                  className="hover:bg-[#FAF7EE] transition-colors h-[54px] cursor-pointer group"
                >
                  <td className="py-3 px-4 font-serif text-sm font-bold text-[#1F2F4F] group-hover:text-[#2F5D3F] transition-colors">
                    {rx.patient.name}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-[#1F2F4F]/80">
                    {rx.patient.id}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#2F5D3F]">
                    {rx.rxNumber}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[#1F2F4F]">{rx.medication.name}</span>
                    {rx.medication.strength && (
                      <span className="text-[11px] text-[#1F2F4F]/60 ml-1.5 font-mono">
                        ({rx.medication.strength})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#1F2F4F]">
                    {rx.dosageText || `${rx.quantity} tabs`}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#1F2F4F]/80">
                    {rx.time || '1:00 PM'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        rx.status === 'Pending Review' || rx.status === 'Pending'
                          ? 'bg-[#E9B8C4]/60 text-[#1F2F4F]'
                          : rx.status === 'Ready for Dispense'
                          ? 'bg-[#2F5D3F]/15 text-[#2F5D3F]'
                          : rx.status === 'Dispensed'
                          ? 'bg-[#2F5D3F]/10 text-[#2F5D3F]'
                          : 'bg-[#FAF7EE] text-[#1F2F4F]/80'
                      }`}
                    >
                      {rx.status === 'Pending Review' ? 'Pending' : rx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRx(rx);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2F5D3F] hover:bg-[#234730] text-white font-semibold text-xs transition-all cursor-pointer shadow-xs uppercase tracking-wider"
                    >
                      REVIEW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
