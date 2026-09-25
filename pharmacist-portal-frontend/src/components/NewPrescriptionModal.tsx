import React, { useState } from 'react';
import { Prescription, PriorityLevel } from '../types';

interface NewPrescriptionModalProps {
  onClose: () => void;
  onAddPrescription: (rx: Prescription) => void;
}

export const NewPrescriptionModal: React.FC<NewPrescriptionModalProps> = ({
  onClose,
  onAddPrescription,
}) => {
  const [patientName, setPatientName] = useState('David Miller');
  const [patientDob, setPatientDob] = useState('1983-05-19');
  const [patientAllergies, setPatientAllergies] = useState('Sulfa drugs');
  const [medicationName, setMedicationName] = useState('Rosuvastatin Calcium');
  const [strength, setStrength] = useState('20 mg');
  const [quantity, setQuantity] = useState(30);
  const [daysSupply, setDaysSupply] = useState(30);
  const [sig, setSig] = useState('Take 1 tablet by mouth daily in the evening.');
  const [prescriberName, setPrescriberName] = useState('Dr. Sarah Jenkins, MD');
  const [priority, setPriority] = useState<PriorityLevel>('STAT');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRx: Prescription = {
      rxNumber: `RX-${Math.floor(100000 + Math.random() * 900000)}`,
      patient: {
        id: `PT-${Math.floor(10000 + Math.random() * 90000)}`,
        name: patientName,
        dob: patientDob,
        age: 43,
        gender: 'M',
        weightKg: 78.5,
        allergies: patientAllergies ? patientAllergies.split(',').map(s => s.trim()) : [],
        currentMedications: ['Metoprolol 25mg'],
        conditions: ['Hypercholesterolemia'],
        insuranceProvider: 'Cigna Health Care',
        policyNumber: 'CG-9812401',
        copayAmount: 10.0,
      },
      prescriber: {
        name: prescriberName,
        npi: '1902837461',
        clinic: 'Mercy Heart & Vascular Clinic',
        phone: '(555) 441-2090',
      },
      medication: {
        name: medicationName,
        genericName: medicationName,
        ndc: '00310-0752-30',
        strength: strength,
        dosageForm: 'Oral Film-Coated Tablet',
        packageSize: quantity,
        schedule: 'None',
        manufacturer: 'AstraZeneca',
        lotNumber: 'AZ-7721L',
        expirationDate: '2028-02-28',
      },
      sig,
      quantity,
      daysSupply,
      refillsRemaining: 3,
      totalRefills: 3,
      dateWritten: new Date().toISOString().slice(0, 10),
      priority,
      status: 'Pending Review',
      auxiliaryWarnings: [
        'Take at bedtime or evening',
        'Avoid excessive consumption of alcohol',
      ],
      safetyAlerts: [
        {
          severity: 'info',
          message: 'Intake e-Prescription Validated',
          details: 'Digital signature verified through Surescripts e-prescribing network.',
        },
      ],
    };

    onAddPrescription(newRx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2F4F]/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E5DFCE] text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2F5D3F] text-[20px]">
              post_add
            </span>
            <h3 className="font-serif text-lg font-bold text-[#2F5D3F]">
              Intake New Electronic Prescription (e-Rx)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#FAF7EE] flex items-center justify-center text-[#1F2F4F]/60"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Patient Name:</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Date of Birth:</label>
              <input
                type="date"
                required
                value={patientDob}
                onChange={(e) => setPatientDob(e.target.value)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#1F2F4F] block mb-1">Known Drug Allergies:</label>
            <input
              type="text"
              value={patientAllergies}
              onChange={(e) => setPatientAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa, Aspirin"
              className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-semibold text-[#1F2F4F] block mb-1">Medication Name:</label>
              <input
                type="text"
                required
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Strength:</label>
              <input
                type="text"
                required
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] font-mono focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#1F2F4F] block mb-1">Directions (SIG):</label>
            <input
              type="text"
              required
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Quantity:</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] font-mono focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Days Supply:</label>
              <input
                type="number"
                required
                value={daysSupply}
                onChange={(e) => setDaysSupply(parseInt(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] font-mono focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#1F2F4F] block mb-1">Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full h-9 px-2 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
              >
                <option value="STAT">STAT</option>
                <option value="Urgent">Urgent</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#1F2F4F] block mb-1">Prescribing Doctor:</label>
            <input
              type="text"
              required
              value={prescriberName}
              onChange={(e) => setPrescriberName(e.target.value)}
              className="w-full h-9 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-[#1F2F4F] focus:outline-none focus:border-[#2F5D3F]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5DFCE] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-[#1F2F4F]/70 hover:bg-[#FAF7EE] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#2F5D3F] text-white text-xs font-semibold hover:bg-[#234730] cursor-pointer shadow-xs"
            >
              Transmit to Dispensary Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
