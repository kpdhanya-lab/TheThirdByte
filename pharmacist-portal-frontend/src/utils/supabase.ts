import { createClient } from '@supabase/supabase-js';
import { Pharmacist } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjpigsvmxyvpjcbkxidt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcGlnc3ZteHl2cGpjYmt4aWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTA2NjAsImV4cCI6MjEwNTg4NjY2MH0.NaQ4bTetBLcPs_KENgg5Qu0X-zgW0r9al2VWVaJGASg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbHospitalCode {
  id: string;
  code: string;
  name: string;
  area: string;
  is_active: boolean;
}

export interface DbPharmacist {
  id: string;
  pharmacist_id: string;
  full_name: string;
  license_number: string;
  role: string;
  badge_code?: string;
  station: string;
  security_level: number;
  password_hash: string;
  hospital_code: string;
  is_active: boolean;
}

// Fallback hospital codes
export const INITIAL_HOSPITAL_CODES = [
  { code: '560017', name: 'WellnessVibes Hospital', area: 'Bengaluru' },
  { code: '560076', name: 'Narayana Hospital', area: 'Bannerghatta Road, Bengaluru' },
  { code: '560034', name: 'Spandana Hospital', area: 'Koramangala, Bengaluru' },
];

let cachedHospitalCodes = [...INITIAL_HOSPITAL_CODES];

export async function fetchActiveHospitalCodes() {
  try {
    const { data, error } = await supabase
      .from('hospital_codes')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.warn('Error fetching hospital codes, using cache:', error);
      return cachedHospitalCodes;
    }
    if (data && data.length > 0) {
      cachedHospitalCodes = data.map((d: any) => ({
        code: d.code,
        name: d.name,
        area: d.area || 'Bengaluru',
      }));
    }
    return cachedHospitalCodes;
  } catch (err) {
    console.warn('Network error fetching hospital codes:', err);
    return cachedHospitalCodes;
  }
}

export function findHospitalByCode(code: string, list = cachedHospitalCodes) {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return list.find((h) => h.code.toUpperCase() === normalized);
}

function getAvatarInitials(name: string): string {
  const clean = name.replace(/Dr\.\s*|PharmD|MD|,/gi, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'PH';
}

export async function authenticatePharmacist(
  hospitalCode: string,
  pharmacistId: string,
  passwordInput: string
): Promise<{ success: boolean; pharmacist?: Pharmacist; error?: string }> {
  try {
    const cleanHospCode = hospitalCode.trim();
    const cleanId = pharmacistId.trim().toUpperCase();

    // 1. Fetch hospital details
    const hospitalList = await fetchActiveHospitalCodes();
    const matchedHospital = hospitalList.find((h) => h.code === cleanHospCode);
    if (!matchedHospital) {
      return {
        success: false,
        error: `Hospital code ${cleanHospCode} is invalid or inactive in the system.`,
      };
    }

    // 2. Query pharmacists table
    const { data, error } = await supabase
      .from('pharmacists')
      .select('*')
      .ilike('pharmacist_id', cleanId)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      // If table doesn't exist yet, return helpful prompt
      if (error.code === '42P01' || error.message.includes('relation "public.pharmacists" does not exist')) {
        return {
          success: false,
          error: 'The pharmacists table has not been created in Supabase yet. Please execute the SQL setup script in Supabase SQL editor.',
        };
      }
      return { success: false, error: `Authentication error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: `Pharmacist ID "${pharmacistId}" is not registered in the database. Please contact your hospital administrator.`,
      };
    }

    const pharmacistRecord: DbPharmacist = data[0];

    // 3. Verify password
    if (pharmacistRecord.password_hash !== passwordInput) {
      return {
        success: false,
        error: 'Invalid password. Please check your credentials.',
      };
    }

    // 4. Verify assigned hospital code
    if (pharmacistRecord.hospital_code !== cleanHospCode) {
      const assignedHospital = hospitalList.find((h) => h.code === pharmacistRecord.hospital_code);
      const assignedName = assignedHospital ? `${assignedHospital.name} (${pharmacistRecord.hospital_code})` : pharmacistRecord.hospital_code;
      return {
        success: false,
        error: `Hospital mismatch: Pharmacist ${pharmacistRecord.pharmacist_id} is assigned to ${assignedName}. You cannot log into ${matchedHospital.name}.`,
      };
    }

    // 5. Build Pharmacist object
    const pharmacist: Pharmacist = {
      id: pharmacistRecord.pharmacist_id,
      name: pharmacistRecord.full_name,
      licenseNumber: pharmacistRecord.license_number,
      role: pharmacistRecord.role,
      badgeCode: pharmacistRecord.badge_code || `STA-AUTH-${pharmacistRecord.pharmacist_id}`,
      avatarInitials: getAvatarInitials(pharmacistRecord.full_name),
      station: pharmacistRecord.station || 'Station 1',
      securityLevel: pharmacistRecord.security_level || 4,
      hospitalCode: matchedHospital.code,
      hospitalName: matchedHospital.name,
      hospitalArea: matchedHospital.area,
    };

    return { success: true, pharmacist };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Connection failed while authenticating pharmacist.',
    };
  }
}

export async function fetchPharmacistById(pharmacistId: string): Promise<Pharmacist | null> {
  try {
    const cleanId = pharmacistId.trim().toUpperCase();
    const { data, error } = await supabase
      .from('pharmacists')
      .select('*')
      .ilike('pharmacist_id', cleanId)
      .eq('is_active', true)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const pharmacistRecord: DbPharmacist = data[0];
    const hospitalList = await fetchActiveHospitalCodes();
    const matchedHospital = hospitalList.find((h) => h.code === pharmacistRecord.hospital_code);

    return {
      id: pharmacistRecord.pharmacist_id,
      name: pharmacistRecord.full_name,
      licenseNumber: pharmacistRecord.license_number,
      role: pharmacistRecord.role,
      badgeCode: pharmacistRecord.badge_code || `STA-AUTH-${pharmacistRecord.pharmacist_id}`,
      avatarInitials: getAvatarInitials(pharmacistRecord.full_name),
      station: pharmacistRecord.station || 'Station 1',
      securityLevel: pharmacistRecord.security_level || 4,
      hospitalCode: pharmacistRecord.hospital_code,
      hospitalName: matchedHospital?.name || `Hospital ${pharmacistRecord.hospital_code}`,
      hospitalArea: matchedHospital?.area || '',
    };
  } catch (err) {
    console.error('Error restoring pharmacist session:', err);
    return null;
  }
}
