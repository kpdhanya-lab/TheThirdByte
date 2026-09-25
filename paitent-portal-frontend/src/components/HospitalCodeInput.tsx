import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { fetchActiveHospitalCodes, DbHospitalCode } from '../utils/supabase';

export interface HospitalEntry {
  code: string;
  name: string;
  area: string;
}

// Fallback initial codes if fetching takes a moment or initial load
export const INITIAL_HOSPITAL_CODES: HospitalEntry[] = [
  { code: '560017', name: 'WellnessVibes Hospital', area: 'Bengaluru' },
  { code: '560076', name: 'Narayana Hospital', area: 'Bannerghatta Road, Bengaluru' },
  { code: '560034', name: 'Spandana Hospital', area: 'Koramangala, Bengaluru' },
];

// In-memory cache of valid codes loaded from Supabase
let cachedCodes: HospitalEntry[] = [...INITIAL_HOSPITAL_CODES];
let isFetched = false;

export const getCachedHospitalCodes = (): HospitalEntry[] => cachedCodes;

export const findHospitalByCode = (code: string, list: HospitalEntry[] = cachedCodes): HospitalEntry | undefined => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return list.find((h) => h.code.toUpperCase() === normalized);
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
  const [hospitalList, setHospitalList] = useState<HospitalEntry[]>(cachedCodes);
  const [isLoading, setIsLoading] = useState(!isFetched);

  useEffect(() => {
    let mounted = true;
    fetchActiveHospitalCodes().then((codes: DbHospitalCode[]) => {
      if (!mounted) return;
      if (codes && codes.length > 0) {
        const mapped = codes.map((c) => ({
          code: c.code,
          name: c.name,
          area: c.area || 'Bengaluru',
        }));
        cachedCodes = mapped;
        isFetched = true;
        setHospitalList(mapped);

        // If a value is already set, re-evaluate match with fresh db codes
        if (value) {
          const match = mapped.find((h) => h.code.toUpperCase() === value.trim().toUpperCase());
          onChange(value, match);
        }
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const matched = findHospitalByCode(value, hospitalList);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const match = findHospitalByCode(sanitized, hospitalList);
    onChange(sanitized, match);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold text-[#164529] uppercase tracking-wider mb-2"
        >
          HOSPITAL CODE <span className="text-[#7a545e]">*</span>
        </label>
        {isLoading && (
          <span className="text-[10px] text-[#717971] flex items-center gap-1 mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing codes...
          </span>
        )}
      </div>

      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={onBlur}
        placeholder="Enter 560017, 560076, or 560034"
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
            Verified: {matched.name} ({matched.area})
          </span>
        </p>
      ) : error ? (
        <p className="mt-1.5 text-xs text-[#ba1a1a] font-semibold">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[#717971]">
          Codes accepted: 560017 (WellnessVibes), 560076 (Narayana), 560034 (Spandana)
        </p>
      )}
    </div>
  );
};
