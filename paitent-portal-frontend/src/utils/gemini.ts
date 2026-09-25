import {
  ExtractedPrescription,
  PRESCRIPTION_EXTRACTION_PROMPT,
  PRESCRIPTION_RESPONSE_SCHEMA,
} from '../types/prescriptionExtraction';

/**
 * Convert a File object to base64 data string and detect mimeType
 */
export async function fileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64Data] = result.split(',', 2);
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';
      resolve({ base64Data, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Send API key to the backend server to update server-side GROQ_API_KEY.
 * The browser never retains or directly uses the key for AI calls.
 */
export async function updateServerGroqApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/config/groq-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey.trim() }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }
  return res.json();
}

/**
 * Check if GROQ_API_KEY is configured on the server
 */
export async function checkServerGroqKeyConfigured(): Promise<boolean> {
  try {
    const res = await fetch('/api/config/groq-key');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

/**
 * Extract prescription details via the backend server (which calls Groq's vision endpoint via OpenAI SDK).
 * No AI calls originate from the client browser.
 */
export async function extractPrescriptionFromImage(file: File): Promise<ExtractedPrescription> {
  const { base64Data, mimeType } = await fileToBase64(file);

  const response = await fetch('/api/extract-prescription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64Data,
      mimeType,
    }),
  });

  const result = await response.json().catch(() => ({
    success: false,
    error: `Server responded with status ${response.status}`,
  }));

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to extract prescription with Groq API.');
  }

  const parsed = result.data as ExtractedPrescription;
  return {
    patient_name: parsed.patient_name ?? null,
    patient_dob: parsed.patient_dob ?? null,
    patient_age: parsed.patient_age ?? null,
    patient_weight: parsed.patient_weight ?? null,
    prescriber_name: parsed.prescriber_name ?? null,
    prescriber_clinic: parsed.prescriber_clinic ?? null,
    date_written: parsed.date_written ?? null,
    signature_present: parsed.signature_present || 'unclear',
    medications: Array.isArray(parsed.medications)
      ? parsed.medications.map((m) => ({
          medication_name: m.medication_name ?? null,
          strength: m.strength ?? null,
          dosage_form: m.dosage_form ?? null,
          quantity: m.quantity ?? null,
          sig: m.sig ?? null,
          legibility: m.legibility || 'legible',
          dosage_safety_flag: m.dosage_safety_flag || 'not_determinable',
          dosage_safety_reason: m.dosage_safety_reason ?? null,
        }))
      : [],
  };
}

/**
 * Returns a clinical sample prescription extraction matching the schema for immediate demo/fallback testing
 */
export function getSamplePrescriptionExtraction(): ExtractedPrescription {
  return {
    patient_name: 'Eleanor Vance',
    patient_dob: '14-May-1990',
    patient_age: '34 Yrs',
    patient_weight: '58 kg',
    prescriber_name: 'Dr. Aris Thorne, MD',
    prescriber_clinic: 'Metro Heart Clinic & Dispensary',
    date_written: '24-Oct-2026',
    signature_present: 'present',
    medications: [
      {
        medication_name: 'Amoxicillin Clavulanate',
        strength: '625 mg',
        dosage_form: 'Film-coated tablet',
        quantity: '14 tablets',
        sig: '1 tab PO BID x 7 days',
        legibility: 'legible',
        dosage_safety_flag: 'none',
        dosage_safety_reason: 'Dosage 625mg BID is appropriate for adult patient weighing 58kg.',
      },
      {
        medication_name: 'Paracetamol (Acetaminophen)',
        strength: '650 mg',
        dosage_form: 'Tablet',
        quantity: '10 tablets',
        sig: '1 tab PO TID PRN fever',
        legibility: 'legible',
        dosage_safety_flag: 'none',
        dosage_safety_reason: 'Dose within typical adult range (max 3250mg/day).',
      },
      {
        medication_name: 'Cetirizine Hydrochloride',
        strength: '10 mg',
        dosage_form: 'Tablet',
        quantity: '5 tablets',
        sig: '1 tab PO QHS PRN allergy',
        legibility: 'legible',
        dosage_safety_flag: 'none',
        dosage_safety_reason: 'Standard 10mg bedtime dose for adult.',
      },
    ],
  };
}
