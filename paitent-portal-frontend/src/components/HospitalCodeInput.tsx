import React from 'react';
import { Check } from 'lucide-react';

export interface HospitalEntry {
  code: string;
  name: string;
  area: string;
}

export const VALID_HOSPITAL_CODES: HospitalEntry[] = [
  { code: 'MPH-560017', name: 'Manipal Hospital', area: 'Old Airport Road' },
  { code: 'APL-560076', name: 'Apollo Hospital', area: 'Bannerghatta Road' },
  { code: 'FRT-560052', name: 'Fortis Hospital', area: 'Cunningham Road' },
  { code: 'NRY-560099', name: 'Narayana Health City', area: 'Bommasandra' },
  { code: 'SGH-560011', name: 'Sagar Hospital', area: 'Jayanagar' },
  { code: 'CLD-560034', name: 'Cloudnine Hospital', area: 'Koramangala' },
];

export const findHospitalByCode = (code: string): HospitalEntry | undefined => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return VALID_HOSPITAL_CODES.find((h) => h.code.toUpperCase() === normalized);
};

export interface HospitalCodeInputProps {
  value: string;
  onChange: (value: string, matched: HospitalEntry | undefined) => void;
  error?: string;
  onBlur?: () => void;
  id?: string;
}

export const HospitalCodeInput: React.FC<HospitalCodeInputProps> = ({
  value,
  onChange,
  error,
  onBlur,
  id = 'hospital-code-input',
}) => {
  const matched = findHospitalByCode(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically convert what the user types to UPPERCASE and trim spaces.
    // Allow only letters, numbers and hyphens.
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const match = findHospitalByCode(sanitized);
    onChange(sanitized, match);
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-[#164529] uppercase tracking-wider mb-2"
      >
        HOSPITAL CODE <span className="text-[#7a545e]">*</span>
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={onBlur}
        placeholder="Enter the code given by your hospital"
        className={`w-full bg-[#ffffff] text-[#1d1c13] text-sm rounded-xl px-4 py-3 border transition-colors shadow-sm placeholder:text-[#c1c9c0] uppercase tracking-wider font-medium focus:outline-none ${
          error
            ? 'border-[#ba1a1a] focus:border-[#ba1a1a]'
            : matched
            ? 'border-[#164529] focus:border-[#164529]'
            : 'border-[#164529]/20 focus:border-[#164529]'
        }`}
      />

      {/* Mutually exclusive feedback line under the field */}
      {matched ? (
        <p className="mt-1.5 text-xs text-[#164529] font-semibold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-[#164529] shrink-0" />
          <span>
            Verified: {matched.name}, {matched.area}
          </span>
        </p>
      ) : error ? (
        <p className="mt-1.5 text-xs text-[#ba1a1a] font-semibold">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[#717971]">
          Your hospital gives you this unique code.
        </p>
      )}
    </div>
  );
};
