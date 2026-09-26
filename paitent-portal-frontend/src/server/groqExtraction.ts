import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import {
  ExtractedPrescription,
  PRESCRIPTION_EXTRACTION_PROMPT,
  GROQ_STRICT_PRESCRIPTION_SCHEMA,
} from '../types/prescriptionExtraction';

/**
 * Current primary vision-capable model on Groq
 */
export const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
export const GROQ_FALLBACK_VISION_MODEL = 'qwen/qwen3.8-27b';

/**
 * Read the current server-side GROQ_API_KEY dynamically
 */
export function getGroqApiKey(): string {
  // 1. Check in-memory process.env
  let key = process.env.GROQ_API_KEY?.trim() || '';
  if (key) return key.replace(/^["']|["']$/g, '');

  // 2. Read directly from .env files on disk across multiple likely locations
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'paitent-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/paitent-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
  ];

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^GROQ_API_KEY=(.+)$/m);
        if (match && match[1]?.trim()) {
          const parsed = match[1].trim().replace(/^["']|["']$/g, '');
          if (parsed && !parsed.includes('=')) {
            process.env.GROQ_API_KEY = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // continue searching other paths
    }
  }

  return '';
}

/**
 * Save / Update GROQ_API_KEY in process.env and safely persist to .env files
 */
export function saveGroqApiKeyToServer(apiKey: string): { success: boolean; message: string } {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
  process.env.GROQ_API_KEY = cleanKey;

  const targetPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'paitent-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/paitent-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/.env'),
  ];

  let savedCount = 0;
  for (const envPath of targetPaths) {
    try {
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
      }

      if (/^GROQ_API_KEY=.*$/m.test(content)) {
        content = content.replace(/^GROQ_API_KEY=.*$/m, `GROQ_API_KEY=${cleanKey}`);
      } else {
        content = content.trim() ? `${content.trim()}\nGROQ_API_KEY=${cleanKey}\n` : `GROQ_API_KEY=${cleanKey}\n`;
      }

      fs.writeFileSync(envPath, content, 'utf8');
      savedCount++;
    } catch (err: any) {
      console.warn(`[Server] Note: Could not write to ${envPath}:`, err?.message);
    }
  }

  console.log(`[Server Groq Key] Saved GROQ_API_KEY to ${savedCount} target files and in-memory process.env.`);
  return { success: true, message: 'GROQ_API_KEY successfully saved to server configuration.' };
}

/**
 * Map Groq error responses to clear clinical & developer diagnostics
 */
export function formatGroqError(err: any): string {
  const status = err?.status || err?.statusCode;
  const msg = err?.message || String(err);

  if (status === 401 || msg.includes('401') || msg.includes('Invalid API Key') || msg.includes('invalid_api_key')) {
    return 'Invalid Groq API Key (401). Please verify your Groq key at https://console.groq.com/keys (should start with gsk_) and update it in the settings drawer.';
  }
  if (status === 403 || msg.includes('403') || msg.includes('permission_denied')) {
    return 'Groq Access Denied (403). Your account/project lacks permissions for this model or vision endpoint.';
  }
  if (status === 429 || msg.includes('429') || msg.includes('rate_limit') || msg.includes('Rate limit')) {
    return 'Groq Rate Limit Exceeded (429). The request frequency limit was reached. Please wait a moment and try again.';
  }
  if (status === 404 || msg.includes('404') || msg.includes('model_not_found')) {
    return `Groq model not found or currently unavailable (${GROQ_VISION_MODEL}).`;
  }
  if (msg.includes('Gemini') || msg.includes('PERMISSION_DENIED')) {
    return `Gemini fallback diagnostic: ${msg}`;
  }
  return `Groq API Error: ${msg}`;
}

/**
 * Server-side prescription extraction using OpenAI SDK directed to Groq's vision endpoint
 */
export async function extractPrescriptionWithGroq(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedPrescription> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server. Please enter your Groq API key in the settings drawer.');
  }

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const cleanMime = mimeType || 'image/jpeg';
  // Strip data prefix if provided
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',', 2)[1] : imageBase64;
  const dataUri = `data:${cleanMime};base64,${base64Data}`;

  let rawContent: string | null = null;
  let lastError: any = null;

  // Use qwen/qwen3.8-27b (Groq's active vision model)
  const modelsToTry = [GROQ_VISION_MODEL];

  for (const model of modelsToTry) {
    // 1. Try with response_format json_schema first
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: PRESCRIPTION_EXTRACTION_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                },
              },
            ],
          },
        ],
        max_tokens: 900,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'prescription_extraction',
            strict: true,
            schema: GROQ_STRICT_PRESCRIPTION_SCHEMA,
          },
        },
      });

      rawContent = response.choices[0]?.message?.content || null;
      if (rawContent) break;
    } catch (schemaErr: any) {
      lastError = schemaErr;
      console.warn(`[Groq API] Model ${model} json_schema attempt note:`, schemaErr?.message || schemaErr);

      // If 401 auth error, fail immediately rather than retrying different models
      if (schemaErr?.status === 401 || schemaErr?.message?.includes('401')) {
        throw new Error(formatGroqError(schemaErr));
      }

      // 2. Fall back to json_object mode if json_schema is not enabled for preview model
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${PRESCRIPTION_EXTRACTION_PROMPT}\n\nReturn strictly valid JSON adhering to this schema:\n${JSON.stringify(GROQ_STRICT_PRESCRIPTION_SCHEMA)}`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUri,
                  },
                },
              ],
            },
          ],
          max_tokens: 900,
          response_format: { type: 'json_object' },
        });

        rawContent = response.choices[0]?.message?.content || null;
        if (rawContent) break;
      } catch (jsonErr: any) {
        lastError = jsonErr;
        console.warn(`[Groq API] Model ${model} json_object attempt note:`, jsonErr?.message || jsonErr);
        if (jsonErr?.status === 401 || jsonErr?.message?.includes('401')) {
          throw new Error(formatGroqError(jsonErr));
        }
      }
    }
  }

  if (!rawContent) {
    throw new Error(formatGroqError(lastError || new Error('Empty response received from Groq vision model.')));
  }

  try {
    let clean = rawContent.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(clean) as ExtractedPrescription;
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
  } catch (parseErr) {
    console.error('[Groq Parse Error] Received content:', rawContent);
    throw new Error('Groq returned a response that could not be parsed according to the prescription schema.');
  }
}
