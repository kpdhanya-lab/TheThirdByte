import { createClient } from '@supabase/supabase-js';
import { ExtractedPrescription } from '../types/prescriptionExtraction';
import { DispenseToken } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjpigsvmxyvpjcbkxidt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcGlnc3ZteHl2cGpjYmt4aWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTA2NjAsImV4cCI6MjEwNTg4NjY2MH0.NaQ4bTetBLcPs_KENgg5Qu0X-zgW0r9al2VWVaJGASg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbPrescription {
  id?: string;
  created_at?: string;
  patient_name?: string | null;
  patient_address?: string | null;
  patient_dob?: string | null;
  patient_age?: string | null;
  patient_weight?: string | null;
  allergies?: any;
  doctor_name?: string | null;
  prescriber_name?: string | null;
  doctor_address?: string | null;
  prescriber_clinic?: string | null;
  npi_number?: string | null;
  dea_number?: string | null;
  signature_present?: 'present' | 'absent' | 'unclear' | null;
  date_of_issue?: string | null;
  date_written?: string | null;
  status?: string;
  raw_extracted_json?: any;
  hospital_code?: string | null;
}

export interface DbMedication {
  id?: string;
  prescription_id: string;
  medication_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  quantity_to_dispense?: string | null;
  quantity?: string | null;
  sig?: string | null;
  refill_info?: string | null;
  legibility?: 'legible' | 'partially_legible' | 'illegible' | null;
  dosage_safety_flag?: 'none' | 'review_recommended' | 'not_determinable' | null;
  dosage_safety_reason?: string | null;
  created_at?: string;
}

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

/**
 * Save Groq-extracted prescription metadata and medication line items into Supabase.
 * Returns the generated prescription UUID.
 */
export async function saveExtractedPrescriptionToSupabase(
  extracted: ExtractedPrescription,
  patient?: { name?: string; address?: string; age?: number; hospitalCode?: string }
): Promise<{ success: boolean; prescriptionId?: string; error?: string }> {
  try {
    // 1. Insert header record into prescriptions table
    const { data: prescriptionData, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert({
        patient_name: extracted.patient_name || patient?.name || 'Walk-in Patient',
        patient_address: patient?.address || null,
        patient_dob: extracted.patient_dob || null,
        patient_age: extracted.patient_age || (patient?.age ? `${patient.age} Yrs` : null),
        patient_weight: extracted.patient_weight || null,
        allergies: [],
        doctor_name: extracted.prescriber_name || null,
        prescriber_name: extracted.prescriber_name || null,
        doctor_address: extracted.prescriber_clinic || null,
        prescriber_clinic: extracted.prescriber_clinic || null,
        signature_present: extracted.signature_present || 'unclear',
        date_of_issue: extracted.date_written || null,
        date_written: extracted.date_written || null,
        hospital_code: patient?.hospitalCode || null,
        status: 'pending_review',
        raw_extracted_json: extracted,
      })
      .select('id')
      .single();

    if (prescriptionError || !prescriptionData) {
      console.error('Failed to insert prescription into Supabase:', prescriptionError);
      return { success: false, error: prescriptionError?.message || 'Failed to save prescription' };
    }

    const prescriptionId = prescriptionData.id;

    // 2. Insert line items into medications table (linked by prescription_id)
    if (extracted.medications && extracted.medications.length > 0) {
      const medicationsToInsert = extracted.medications.map((m) => ({
        prescription_id: prescriptionId,
        medication_name: m.medication_name || '[Unreadable Name]',
        strength: m.strength || null,
        dosage_form: m.dosage_form || null,
        quantity_to_dispense: m.quantity || null,
        quantity: m.quantity || null,
        sig: m.sig || null,
        legibility: m.legibility || 'legible',
        dosage_safety_flag: m.dosage_safety_flag || 'not_determinable',
        dosage_safety_reason: m.dosage_safety_reason || null,
      }));

      const { error: medError } = await supabase
        .from('medications')
        .insert(medicationsToInsert);

      if (medError) {
        console.error('Failed to insert medications into Supabase:', medError);
        return {
          success: true,
          prescriptionId,
          error: 'Prescription saved, but some medications could not be stored: ' + medError.message,
        };
      }
    }

    console.log('[Supabase] Successfully saved prescription and medications:', prescriptionId);
    return { success: true, prescriptionId };
  } catch (err: any) {
    console.error('Unexpected error saving prescription to Supabase:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Obtain a cryptographically signed patient session token from the server
 * based on verified patient phone/identity in Supabase.
 */
export async function requestPatientSessionToken(phone: string): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/patient-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();
    if (data.success && data.sessionToken) {
      localStorage.setItem('patient_session_token', data.sessionToken);
      return data.sessionToken;
    }
    return null;
  } catch (err) {
    console.warn('[requestPatientSessionToken] Error:', err);
    return null;
  }
}

/**
 * Get active patient session token
 */
export function getPatientSessionToken(): string | null {
  return localStorage.getItem('patient_session_token');
}

/**
 * Fetch the active dispensing token for the authenticated patient from the server.
 * Requirement 10: Display the active token in the patient portal.
 */
export async function fetchActiveDispenseToken(): Promise<{ success: boolean; token?: DispenseToken | null; error?: string }> {
  try {
    const sessionToken = getPatientSessionToken();
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const res = await fetch('/api/dispense-tokens/active', {
      method: 'GET',
      headers,
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[fetchActiveDispenseToken Error]:', err);
    return { success: false, error: err?.message || 'Failed to fetch active token.' };
  }
}

/**
 * Securely redeem an active dispensing token exactly once.
 * Calls the Supabase Edge Function: redeem-dispense-token.
 * Requirement 5: Edge function verifies authenticated patient, verifies token ownership,
 * checks status is 'issued', checks expiration, atomically updates to 'dispense_requested',
 * sets used_at, and rejects duplicate clicks.
 */
export async function claimDispenseTokenApi(token: string): Promise<{ success: boolean; token?: DispenseToken; error?: string; status?: number }> {
  try {
    const sessionToken = getPatientSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    // 1. Invoke Supabase Edge Function: redeem-dispense-token
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('redeem-dispense-token', {
        body: { token },
        headers,
      });

      if (!edgeError && edgeData && edgeData.success) {
        return {
          success: true,
          token: edgeData as DispenseToken,
          status: 200,
        };
      } else if (edgeError) {
        // If Edge function returned an application error response
        const errMsg = (edgeError as any)?.context?.message || edgeError.message;
        if (errMsg && !errMsg.includes('Failed to send a request') && !errMsg.includes('FunctionsFetchError')) {
          return {
            success: false,
            error: errMsg,
            status: (edgeError as any)?.context?.status || 400,
          };
        }
      }
    } catch (edgeCallErr: any) {
      console.warn('[Supabase Edge Function redeem-dispense-token notice]:', edgeCallErr?.message);
    }

    // 2. Direct fallback to backend server endpoint for local development
    const res = await fetch('/api/dispense-tokens/claim', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    return { ...data, status: res.status };
  } catch (err: any) {
    console.error('[claimDispenseTokenApi Error]:', err);
    return { success: false, error: err?.message || 'Network error claiming token.', status: 500 };
  }
}

/**
 * Subscribe to realtime dispense token updates for the patient.
 */
export function subscribeToPatientDispenseTokens(
  patientId: string | undefined,
  onTokenChange: (token: DispenseToken) => void
) {
  const channel = supabase
    .channel('patient-realtime-tokens')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dispense_tokens',
      },
      (payload) => {
        const row: any = payload.new || payload.old;
        if (row && (!patientId || row.patient_id === patientId)) {
          onTokenChange(row as DispenseToken);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


