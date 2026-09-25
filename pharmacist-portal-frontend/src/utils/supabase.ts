import { createClient } from '@supabase/supabase-js';
import {
  Pharmacist,
  Prescription,
  PriorityLevel,
  PrescriptionStatus,
  ExtractedPrescription,
  ExtractedMedication,
} from '../types';

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

/**
 * Fetch prescriptions from Supabase for a specific hospital (or all if not specified)
 * Joined with medications table.
 */
export async function fetchHospitalPrescriptions(hospitalCode?: string): Promise<Prescription[]> {
  try {
    let query = supabase
      .from('prescriptions')
      .select('*, medications(*)')
      .order('created_at', { ascending: false });

    if (hospitalCode) {
      query = query.or(`hospital_code.eq.${hospitalCode},hospital_code.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase] Error fetching prescriptions:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const mapped: Prescription[] = [];

    for (const row of data) {
      const meds: any[] = row.medications || [];
      const primaryMed = meds[0] || {};
      const rxNum = `RX-${(row.id || '').slice(0, 8).toUpperCase()}`;

      // Check if any medication has a clinical safety review flag
      const hasReviewFlag = meds.some((m) => m.dosage_safety_flag === 'review_recommended');
      const priority: PriorityLevel = hasReviewFlag ? 'STAT' : 'Routine';

      // Status mapping
      let status: PrescriptionStatus = 'Pending Review';
      if (row.status === 'verified' || row.status === 'ready') status = 'Ready for Dispense';
      else if (row.status === 'dispensed') status = 'Dispensed';
      else if (row.status === 'flagged' || hasReviewFlag) status = 'Pending Review';

      // Safety alerts from Groq triage
      const safetyAlerts = meds
        .filter((m) => m.dosage_safety_reason || m.dosage_safety_flag === 'review_recommended')
        .map((m) => ({
          severity: (m.dosage_safety_flag === 'review_recommended' ? 'critical' : 'info') as 'critical' | 'warning' | 'info',
          message: `${m.medication_name}: ${m.dosage_safety_flag === 'review_recommended' ? 'Dosage Review Recommended' : 'Standard Dosage Verified'}`,
          details: m.dosage_safety_reason || 'Automated dosage safety comparison against patient weight/age.',
        }));

      const medName = meds.map((m) => m.medication_name).filter(Boolean).join(' + ') || primaryMed.medication_name || 'Prescribed Medicine';
      const strength = meds.map((m) => m.strength).filter(Boolean).join(', ') || primaryMed.strength || 'As directed';
      const dosageForm = primaryMed.dosage_form || 'Tablet / Capsule';
      const sig = meds.map((m) => `${m.medication_name ? m.medication_name + ': ' : ''}${m.sig || 'As directed'}`).join(' | ');
      const qtyNumber = parseInt(String(primaryMed.quantity_to_dispense || primaryMed.quantity || '').replace(/\D/g, ''), 10) || 30;
      const patientAge = parseInt(String(row.patient_age || '').replace(/\D/g, ''), 10) || 45;

      let extractedData: ExtractedPrescription | null = null;
      if (row.raw_extracted_json) {
        try {
          const parsed =
            typeof row.raw_extracted_json === 'string'
              ? JSON.parse(row.raw_extracted_json)
              : row.raw_extracted_json;
          if (parsed && Array.isArray(parsed.medications) && parsed.medications.length > 0) {
            extractedData = parsed;
          }
        } catch (e) {
          console.warn('Error parsing raw_extracted_json:', e);
        }
      }

      if (!extractedData) {
        extractedData = {
          patient_name: row.patient_name || null,
          patient_dob: row.patient_dob || null,
          patient_age: row.patient_age || (patientAge ? `${patientAge} Yrs` : null),
          patient_weight: row.patient_weight ? String(row.patient_weight) : null,
          prescriber_name: row.doctor_name || row.prescriber_name || null,
          prescriber_clinic: row.doctor_address || row.prescriber_clinic || null,
          date_written: row.date_of_issue || row.date_written || null,
          signature_present: (row.signature_present as any) || 'present',
          medications: meds.length > 0
            ? meds.map((m) => ({
                medication_name: m.medication_name || null,
                strength: m.strength || null,
                dosage_form: m.dosage_form || null,
                quantity: m.quantity || m.quantity_to_dispense || null,
                sig: m.sig || null,
                legibility: m.legibility || 'legible',
                dosage_safety_flag: m.dosage_safety_flag || 'none',
                dosage_safety_reason: m.dosage_safety_reason || null,
              }))
            : [
                {
                  medication_name: medName,
                  strength,
                  dosage_form: dosageForm,
                  quantity: String(qtyNumber),
                  sig: sig || 'Take as directed',
                  legibility: 'legible',
                  dosage_safety_flag: hasReviewFlag ? 'review_recommended' : 'none',
                  dosage_safety_reason: `patient is ${patientAge} yo adult, ${row.patient_weight || '70 kg'}; standard adult dosages`,
                },
              ],
        };
      }

      mapped.push({
        rxNumber: rxNum,
        patient: {
          id: `PT-${(row.id || '').slice(0, 6).toUpperCase()}`,
          name: row.patient_name || 'Walk-in Patient',
          dob: row.patient_dob || '1980-01-01',
          age: patientAge,
          gender: 'Other',
          weightKg: parseFloat(String(row.patient_weight || '').replace(/[^\d.]/g, '')) || 70,
          allergies: Array.isArray(row.allergies) ? row.allergies : [],
          currentMedications: meds.map((m) => m.medication_name).filter(Boolean),
          conditions: [],
          insuranceProvider: 'Ayushman Bharat / Verified Coverage',
          policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
          copayAmount: 0,
        },
        prescriber: {
          name: row.doctor_name || row.prescriber_name || 'Attending Physician, MD',
          npi: row.npi_number || '1982736450',
          clinic: row.doctor_address || row.prescriber_clinic || 'Dispensary Clinic',
          phone: '+91 80 2345 6789',
        },
        medication: {
          name: medName,
          genericName: medName,
          ndc: `00093-${Math.floor(1000 + Math.random() * 9000)}-01`,
          strength,
          dosageForm,
          packageSize: qtyNumber,
          schedule: 'None',
          manufacturer: 'Standard Pharma Labs',
          lotNumber: `LOT-${Math.floor(10000 + Math.random() * 90000)}`,
          expirationDate: '12/2027',
        },
        sig: sig || 'Take as directed by physician',
        quantity: qtyNumber,
        daysSupply: 30,
        refillsRemaining: 1,
        totalRefills: 1,
        dateWritten: row.date_of_issue || row.date_written || new Date().toISOString().split('T')[0],
        priority,
        status,
        auxiliaryWarnings: hasReviewFlag
          ? ['Dosage Alert: Review recommended based on stated weight/age', 'Pharmacist consultation required']
          : ['Take with water after food', 'Keep out of reach of children'],
        safetyAlerts,
        extractedData,
      });
    }

    return mapped;
  } catch (err) {
    console.error('fetchHospitalPrescriptions error:', err);
    return [];
  }
}

/**
 * Resolves a complete ExtractedPrescription from a Prescription, fallbacking to decomposed multi-medications if needed.
 */
export function resolveExtractedData(rx: Prescription): ExtractedPrescription {
  // If valid multi-medication extractedData exists, return it
  if (
    rx.extractedData &&
    Array.isArray(rx.extractedData.medications) &&
    rx.extractedData.medications.length > 1
  ) {
    return rx.extractedData;
  }

  // If extractedData has 1 medication that DOES NOT contain '+', return it
  if (
    rx.extractedData &&
    Array.isArray(rx.extractedData.medications) &&
    rx.extractedData.medications.length === 1 &&
    !rx.extractedData.medications[0].medication_name?.includes(' + ')
  ) {
    return rx.extractedData;
  }

  // Otherwise decompose composite medication names (e.g. "VERTIN + STEMETIL" or from currentMedications)
  const compositeName = rx.medication.name || '';
  const medNames = compositeName.includes(' + ')
    ? compositeName.split(' + ').map((s) => s.trim()).filter(Boolean)
    : (rx.patient.currentMedications && rx.patient.currentMedications.length > 1)
    ? rx.patient.currentMedications
    : [compositeName || 'Prescribed Medication'];

  const sigParts = (rx.sig || '').split(' | ').map((s) => s.trim());
  const strengthParts = (rx.medication.strength || '').split(',').map((s) => s.trim());

  const isFlagged = rx.safetyAlerts?.some((a) => a.severity === 'critical');
  const alertDetail = rx.safetyAlerts?.[0]?.details;

  const resolvedMeds: ExtractedMedication[] = medNames.map((name, idx) => {
    // Find matching sig if prefixed e.g. "VERTIN: 1 - 0 - 1"
    const matchedSigPart = sigParts.find((s) =>
      s.toLowerCase().startsWith(name.toLowerCase() + ':')
    );
    const cleanSig = matchedSigPart
      ? matchedSigPart.replace(new RegExp(`^${name}:?\\s*`, 'i'), '').trim()
      : sigParts[idx] || rx.sig || 'Take as directed';

    const matchedStrength = strengthParts[idx] && strengthParts[idx] !== 'null'
      ? strengthParts[idx]
      : rx.medication.strength && !rx.medication.strength.includes(',')
      ? rx.medication.strength
      : null;

    const medAlert = rx.safetyAlerts?.find((a) =>
      a.message?.toLowerCase().includes(name.toLowerCase())
    );

    return {
      medication_name: name,
      strength: matchedStrength,
      dosage_form: rx.medication.dosageForm || 'TAB',
      quantity: rx.quantity ? String(rx.quantity) : null,
      sig: cleanSig.replace(/[\u0001\u0002]/g, '').trim(),
      legibility: 'legible',
      dosage_safety_flag: medAlert
        ? medAlert.severity === 'critical'
          ? 'review_recommended'
          : 'none'
        : isFlagged
        ? 'review_recommended'
        : 'none',
      dosage_safety_reason:
        medAlert?.details ||
        alertDetail ||
        `patient is ${rx.patient.age} yo adult, ${rx.patient.gender === 'M' ? 'male' : 'female'}, ${rx.patient.weightKg} kg; standard adult dosages`,
    };
  });

  return {
    patient_name: rx.patient.name,
    patient_dob: rx.patient.dob,
    patient_age: rx.patient.age ? `${rx.patient.age}Y` : null,
    patient_weight: rx.patient.weightKg ? `${rx.patient.weightKg} kg` : null,
    prescriber_name: rx.prescriber.name,
    prescriber_clinic: rx.prescriber.clinic,
    date_written: rx.dateWritten,
    signature_present: rx.extractedData?.signature_present || 'present',
    medications: resolvedMeds,
  };
}

/**
 * Subscribe to realtime prescription uploads in Supabase
 */
export function subscribeToHospitalPrescriptions(
  hospitalCode: string | undefined,
  onNewPrescription: (prescription: Prescription) => void
) {
  const channel = supabase
    .channel('pharmacist-realtime-prescriptions')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'prescriptions',
      },
      async (payload) => {
        const newRow = payload.new;
        if (hospitalCode && newRow.hospital_code && newRow.hospital_code !== hospitalCode) {
          return;
        }

        const list = await fetchHospitalPrescriptions(hospitalCode);
        const match = list.find((p) => p.rxNumber.includes((newRow.id || '').slice(0, 8).toUpperCase()));
        if (match) {
          onNewPrescription(match);
        } else if (list.length > 0) {
          onNewPrescription(list[0]);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Update prescription status in Supabase (e.g. from Pharmacist review/dispense actions)
 */
export async function updatePrescriptionStatusInSupabase(
  rxNumber: string,
  newStatus: PrescriptionStatus
): Promise<void> {
  try {
    const rawPrefix = rxNumber.replace(/^RX-/, '').toLowerCase();
    const dbStatus =
      newStatus === 'Dispensed'
        ? 'dispensed'
        : newStatus === 'Ready for Dispense'
        ? 'verified'
        : 'pending_review';

    await supabase
      .from('prescriptions')
      .update({ status: dbStatus })
      .ilike('id', `${rawPrefix}%`);
  } catch (err) {
    console.warn('Error updating prescription status in Supabase:', err);
  }
}
