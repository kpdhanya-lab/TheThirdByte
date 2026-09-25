export interface ExtractedMedication {
  medication_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  quantity: string | null;
  sig: string | null;
  legibility: 'legible' | 'partially_legible' | 'illegible';
  dosage_safety_flag: 'none' | 'review_recommended' | 'not_determinable';
  dosage_safety_reason: string | null;
}

export interface ExtractedPrescription {
  patient_name: string | null;
  patient_dob: string | null;
  patient_age: string | null;
  patient_weight: string | null;
  prescriber_name: string | null;
  prescriber_clinic: string | null;
  date_written: string | null;
  signature_present: 'present' | 'absent' | 'unclear';
  medications: ExtractedMedication[];
}

export const PRESCRIPTION_EXTRACTION_PROMPT = `You are extracting structured data from a photo or scan of a medical 
prescription for digitization purposes. Follow these rules exactly:

TRANSCRIPTION RULES
1. Only extract information that is visibly present in the image. Never 
   guess, infer, or auto-correct a name, number, or dosage you cannot 
   clearly read.
2. If a field is missing, illegible, or not present on the prescription, 
   return null. Do not substitute an empty string or a placeholder.
3. Extract each distinct medication as a separate entry in "medications", 
   even if some of its fields are unreadable.
4. For "sig", transcribe the directions for use as written, including any 
   abbreviations (e.g. "1 tab PO BID"), without translating or expanding them.
5. For "signature_present", mark "present" only if a handwritten or 
   digital signature mark is visibly present near the prescriber section, 
   "absent" if that area is visibly blank, and "unclear" if the image 
   quality or cropping makes it impossible to tell.
6. Mark "legibility" as "illegible" for any medication where the name 
   itself cannot be confidently read — do not fabricate a plausible name 
   to fill the field.

SAFETY FLAG RULES (for "dosage_safety_flag" and "dosage_safety_reason")
7. Compare each medication's strength/quantity against the patient's 
   stated weight and date of birth (age), where both are legible.
8. Set "dosage_safety_flag" to "review_recommended" only if there is a 
   clear, specific mismatch you can point to (e.g. a pediatric-range 
   weight paired with an adult-strength dose, or a dose that appears 
   drastically outside a typical range for the stated weight).
9. Set "dosage_safety_flag" to "not_determinable" if the patient's weight 
   or age is missing/illegible, or if you lack enough information to 
   compare.
10. Set "dosage_safety_flag" to "none" only when weight/age and dosage 
    are both legible and you find no apparent mismatch.
11. This flag is a triage aid for a licensed pharmacist or clinician to 
    review — it is NOT a clinical determination, and "dosage_safety_reason" 
    must state only the specific numbers/facts you compared, not medical 
    advice or a diagnosis.
12. Do not provide dosing recommendations, drug interaction warnings, or 
    any other clinical guidance beyond this comparison.

Return only the structured data — no commentary outside the schema.`;

/**
 * Strict JSON Schema format for OpenAI SDK / Groq structured output (response_format: json_schema).
 * Adheres strictly to:
 * - additionalProperties: false on every object
 * - All properties listed in required
 * - Union types ["string", "null"] for nullable fields
 */
export const GROQ_STRICT_PRESCRIPTION_SCHEMA = {
  type: 'object',
  properties: {
    patient_name: { type: ['string', 'null'] },
    patient_dob: { type: ['string', 'null'] },
    patient_age: { type: ['string', 'null'] },
    patient_weight: { type: ['string', 'null'] },
    prescriber_name: { type: ['string', 'null'] },
    prescriber_clinic: { type: ['string', 'null'] },
    date_written: { type: ['string', 'null'] },
    signature_present: {
      type: 'string',
      enum: ['present', 'absent', 'unclear'],
    },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          medication_name: { type: ['string', 'null'] },
          strength: { type: ['string', 'null'] },
          dosage_form: { type: ['string', 'null'] },
          quantity: { type: ['string', 'null'] },
          sig: { type: ['string', 'null'] },
          legibility: {
            type: 'string',
            enum: ['legible', 'partially_legible', 'illegible'],
          },
          dosage_safety_flag: {
            type: 'string',
            enum: ['none', 'review_recommended', 'not_determinable'],
          },
          dosage_safety_reason: { type: ['string', 'null'] },
        },
        required: [
          'medication_name',
          'strength',
          'dosage_form',
          'quantity',
          'sig',
          'legibility',
          'dosage_safety_flag',
          'dosage_safety_reason',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'patient_name',
    'patient_dob',
    'patient_age',
    'patient_weight',
    'prescriber_name',
    'prescriber_clinic',
    'date_written',
    'signature_present',
    'medications',
  ],
  additionalProperties: false,
};

/**
 * Standard Gemini response schema (kept for backwards compatibility)
 */
export const PRESCRIPTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    patient_name: { type: 'string', nullable: true },
    patient_dob: { type: 'string', nullable: true },
    patient_age: { type: 'string', nullable: true },
    patient_weight: { type: 'string', nullable: true },
    prescriber_name: { type: 'string', nullable: true },
    prescriber_clinic: { type: 'string', nullable: true },
    date_written: { type: 'string', nullable: true },
    signature_present: {
      type: 'string',
      enum: ['present', 'absent', 'unclear'],
    },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          medication_name: { type: 'string', nullable: true },
          strength: { type: 'string', nullable: true },
          dosage_form: { type: 'string', nullable: true },
          quantity: { type: 'string', nullable: true },
          sig: { type: 'string', nullable: true },
          legibility: {
            type: 'string',
            enum: ['legible', 'partially_legible', 'illegible'],
          },
          dosage_safety_flag: {
            type: 'string',
            enum: ['none', 'review_recommended', 'not_determinable'],
          },
          dosage_safety_reason: { type: 'string', nullable: true },
        },
        required: ['medication_name', 'sig', 'legibility', 'dosage_safety_flag'],
      },
    },
  },
  required: ['signature_present', 'medications'],
};
