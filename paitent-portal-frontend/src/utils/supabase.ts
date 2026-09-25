import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjpigsvmxyvpjcbkxidt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcGlnc3ZteHl2cGpjYmt4aWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTA2NjAsImV4cCI6MjEwNTg4NjY2MH0.NaQ4bTetBLcPs_KENgg5Qu0X-zgW0r9al2VWVaJGASg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbHospitalCode {
  id: string;
  code: string;
  name: string;
  area: string;
  is_active: boolean;
  created_at?: string;
}

export interface DbPatient {
  id?: string;
  full_name: string;
  phone: string;
  age: number;
  primary_language: string;
  gender: string;
  address: string;
  email?: string;
  emergency_contact?: string;
  hospital_code?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Standardize phone number for reliable matching:
 * Extracts 10-digit number and prepends standard "+91 " prefix.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return raw.trim();
}

/**
 * Get 10-digit raw mobile string without prefix for query matching
 */
export function getRawMobileDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Fetch all active hospital codes from Supabase
 */
export async function fetchActiveHospitalCodes(): Promise<DbHospitalCode[]> {
  try {
    const { data, error } = await supabase
      .from('hospital_codes')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching hospital codes:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Network error fetching hospital codes:', err);
    return [];
  }
}

/**
 * Find patient by phone number
 */
export async function findPatientByPhone(phone: string): Promise<DbPatient | null> {
  try {
    const digits = getRawMobileDigits(phone);
    if (!digits || digits.length < 10) return null;

    const d1 = digits.slice(0, 5);
    const d2 = digits.slice(5);
    const normalized = normalizePhone(phone);

    // Search using or filter covering exact, formatted, or wildcard spaced
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`phone.eq."${phone.trim()}",phone.eq."${normalized}",phone.ilike."%${digits}%",phone.ilike."%${d1}%${d2}%"`)
      .limit(1);

    if (error) {
      console.error('Error finding patient by phone:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Network error finding patient:', err);
    return null;
  }
}

/**
 * Register a new patient in Supabase
 */
export async function registerPatientInDb(patient: DbPatient): Promise<{ success: boolean; data?: DbPatient; error?: string }> {
  try {
    // Check if phone already registered
    const existing = await findPatientByPhone(patient.phone);
    if (existing) {
      return {
        success: false,
        error: 'This mobile number is already registered. Please go to Login.'
      };
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([{
        full_name: patient.full_name,
        phone: normalizePhone(patient.phone),
        age: patient.age,
        primary_language: patient.primary_language || 'English',
        gender: patient.gender,
        address: patient.address,
        email: patient.email || null,
        emergency_contact: patient.emergency_contact || null,
        hospital_code: patient.hospital_code || null,
      }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register patient' };
  }
}
