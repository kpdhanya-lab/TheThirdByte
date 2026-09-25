import { GoogleGenAI } from '@google/genai';
import {
  ExtractedPrescription,
  PRESCRIPTION_EXTRACTION_PROMPT,
  PRESCRIPTION_RESPONSE_SCHEMA,
} from '../types/prescriptionExtraction';

/**
 * Get Gemini API Key from localStorage, Vite env, or process.env
 */
export function getApiKey(): string {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim()) return localKey.trim();
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (envKey) return envKey;
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  return '';
}

/**
 * Set Gemini API Key in localStorage for quick browser testing
 */
export function setApiKeyOverride(key: string) {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
}

/**
 * Convert a File object to pure base64 string (without the data URL prefix)
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
 * Format user-facing error message based on Gemini API error codes
 */
function formatGeminiError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('403') || msg.includes('denied access') || msg.includes('PERMISSION_DENIED')) {
    return 'Your Google AI Studio/Cloud project was denied access (PERMISSION_DENIED 403). Please verify that the Generative Language API is enabled or try an active API key.';
  }
  if (msg.includes('429') || msg.includes('Rate limit')) {
    return 'Gemini Free Tier rate limit reached (429). Spikes in demand or daily quota exceeded. Please wait a minute or try again.';
  }
  if (msg.includes('503') || msg.includes('high demand')) {
    return 'Gemini model is currently experiencing high demand (503). Please retry in a few moments.';
  }
  return msg || 'Failed to extract structured data with Gemini.';
}

/**
 * Extract structured prescription data from an uploaded file using Gemini 3.8 Flash
 */
export async function extractPrescriptionFromImage(file: File): Promise<ExtractedPrescription> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file or enter it in settings.');
  }

  const { base64Data, mimeType } = await fileToBase64(file);
  const isPdf = mimeType.toLowerCase().includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

  const ai = new GoogleGenAI({ apiKey });

  // Prepare multimodal content parts
  const contentInput: any[] = [
    {
      type: 'text',
      text: PRESCRIPTION_EXTRACTION_PROMPT,
    },
    {
      type: isPdf ? 'document' : 'image',
      data: base64Data,
      mime_type: isPdf ? 'application/pdf' : mimeType,
    },
  ];

  let rawJsonText: string | null = null;
  let lastError: any = null;

  // Primary call: Interactions API with response_format JSON schema
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: contentInput,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: PRESCRIPTION_RESPONSE_SCHEMA,
        },
      });

      rawJsonText = interaction.output_text ?? null;
      if (rawJsonText) break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Extraction] Attempt ${attempt} failed:`, err?.message || err);
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }

  // Fallback call using generateContent if interactions was unavailable
  if (!rawJsonText) {
    try {
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: PRESCRIPTION_EXTRACTION_PROMPT },
              {
                inlineData: {
                  mimeType: isPdf ? 'application/pdf' : mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: PRESCRIPTION_RESPONSE_SCHEMA,
        },
      });
      rawJsonText = fallbackRes.text ?? null;
    } catch (fallbackErr: any) {
      console.error('[Gemini Fallback Error]:', fallbackErr);
      throw new Error(formatGeminiError(lastError || fallbackErr));
    }
  }

  if (!rawJsonText) {
    throw new Error('Gemini returned an empty response. Please verify the prescription image is clear and try again.');
  }

  try {
    const parsed = JSON.parse(rawJsonText) as ExtractedPrescription;
    // Normalize nulls and defaults
    return {
      patient_name: parsed.patient_name || null,
      patient_dob: parsed.patient_dob || null,
      patient_age: parsed.patient_age || null,
      patient_weight: parsed.patient_weight || null,
      prescriber_name: parsed.prescriber_name || null,
      prescriber_clinic: parsed.prescriber_clinic || null,
      date_written: parsed.date_written || null,
      signature_present: parsed.signature_present || 'unclear',
      medications: Array.isArray(parsed.medications)
        ? parsed.medications.map((m) => ({
            medication_name: m.medication_name || null,
            strength: m.strength || null,
            dosage_form: m.dosage_form || null,
            quantity: m.quantity || null,
            sig: m.sig || null,
            legibility: m.legibility || 'legible',
            dosage_safety_flag: m.dosage_safety_flag || 'not_determinable',
            dosage_safety_reason: m.dosage_safety_reason || null,
          }))
        : [],
    };
  } catch (parseErr) {
    console.error('Failed to parse Gemini JSON output:', rawJsonText, parseErr);
    throw new Error('Unable to parse the structured medical data returned by Gemini.');
  }
}

/**
 * Returns a high-fidelity sample prescription extraction matching the schema for immediate demo/fallback testing
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
