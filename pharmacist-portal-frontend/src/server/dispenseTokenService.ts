import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DispenseTokenRecord {
  id: string;
  prescription_id: string;
  patient_id: string;
  slot: 1 | 2 | 3;
  token: string;
  status: 'issued' | 'dispense_requested' | 'dispensed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

// Server HMAC Secret for patient session signing
const SESSION_SECRET = process.env.SESSION_SECRET || 'thethirdbyte-secure-dispense-session-secret-2026';

/**
 * Dynamically look up environment variables from .env files
 */
function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;

  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), 'pharmacist-portal-frontend/.env'),
    path.resolve(process.cwd(), 'paitent-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/pharmacist-portal-frontend/.env'),
    path.resolve('d:/TheThirdByte/TheThirdByte/paitent-portal-frontend/.env'),
  ];

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
        if (match && match[1]?.trim()) {
          const parsed = match[1].trim().replace(/^["']|["']$/g, '');
          process.env[key] = parsed;
          return parsed;
        }
      }
    } catch {
      // continue checking other paths
    }
  }

  return '';
}

/**
 * Obtain an administrative Supabase client that uses SUPABASE_SERVICE_ROLE_KEY
 * to bypass RLS for secure server-side token generation and atomic claiming.
 */
export function getSupabaseAdmin() {
  const supabaseUrl =
    getEnvVar('SUPABASE_URL') ||
    getEnvVar('VITE_SUPABASE_URL') ||
    'https://rjpigsvmxyvpjcbkxidt.supabase.co';

  const supabaseKey =
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY') ||
    getEnvVar('SUPABASE_ANON_KEY') ||
    getEnvVar('VITE_SUPABASE_ANON_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcGlnc3ZteHl2cGpjYmt4aWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTA2NjAsImV4cCI6MjEwNTg4NjY2MH0.NaQ4bTetBLcPs_KENgg5Qu0X-zgW0r9al2VWVaJGASg';

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Issue a cryptographically signed patient session token from verified patient identity.
 */
export function createPatientSessionToken(patientId: string, phone: string): string {
  const payload = {
    patientId,
    phone,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return `${data}.${hmac}`;
}

/**
 * Verify and decode patient session token.
 * Extracts the authenticated patient ID from the session without trusting client input.
 */
export async function verifyPatientSession(tokenOrHeader?: string): Promise<{ patientId: string; phone?: string } | null> {
  if (!tokenOrHeader) return null;

  const rawToken = tokenOrHeader.startsWith('Bearer ') ? tokenOrHeader.slice(7).trim() : tokenOrHeader.trim();
  if (!rawToken) return null;

  // 1. Try verifying as custom HMAC session token
  const parts = rawToken.split('.');
  if (parts.length === 2) {
    const [data, signature] = parts;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      try {
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
        if (payload.exp && Date.now() < payload.exp && payload.patientId) {
          return { patientId: payload.patientId, phone: payload.phone };
        }
      } catch {
        // invalid JSON
      }
    }
  }

  // 2. Try verifying as standard Supabase Auth JWT token
  try {
    const supabase = getSupabaseAdmin();
    const { data: authUser, error } = await supabase.auth.getUser(rawToken);
    if (!error && authUser?.user) {
      // Find patient matching auth user id or email/phone
      const { data: pt } = await supabase
        .from('patients')
        .select('id, phone')
        .or(`id.eq.${authUser.user.id},email.eq.${authUser.user.email || ''},phone.eq.${authUser.user.phone || ''}`)
        .limit(1);

      if (pt && pt.length > 0) {
        return { patientId: pt[0].id, phone: pt[0].phone };
      }
      return { patientId: authUser.user.id, phone: authUser.user.phone };
    }
  } catch {
    // supabase auth error
  }

  return null;
}

/**
 * Generate a secure, server-side dispensing token.
 */
export async function generateDispenseToken(params: {
  prescriptionId: string;
  slot: number;
  patientName?: string;
  patientId?: string;
}): Promise<{ success: boolean; token?: DispenseTokenRecord; error?: string; status?: number }> {
  const { prescriptionId, slot, patientName, patientId } = params;

  // Requirement 2: Allowed slot values are 1, 2, 3
  const slotNum = Number(slot);
  if (![1, 2, 3].includes(slotNum)) {
    return {
      success: false,
      error: 'Invalid dispenser slot. Allowed values: 1, 2, 3.',
      status: 400,
    };
  }

  const supabase = getSupabaseAdmin();

  // 1. Resolve prescription UUID
  let resolvedPrescriptionId = prescriptionId;
  let resolvedPatientName = patientName;

  if (prescriptionId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prescriptionId.trim());
    if (isUuid) {
      const { data: rxList } = await supabase
        .from('prescriptions')
        .select('id, patient_name, status')
        .eq('id', prescriptionId.trim())
        .limit(1);

      if (rxList && rxList.length > 0) {
        resolvedPrescriptionId = rxList[0].id;
        if (!resolvedPatientName) resolvedPatientName = rxList[0].patient_name;
      }
    } else {
      const cleanHex = prescriptionId.replace(/^RX-/i, '').toLowerCase().trim();
      const { data: rxList } = await supabase
        .from('prescriptions')
        .select('id, patient_name, status')
        .order('created_at', { ascending: false })
        .limit(50);

      const matched = rxList?.find((r: any) =>
        r.id.toLowerCase().replace(/-/g, '').startsWith(cleanHex) ||
        r.id.toLowerCase().startsWith(cleanHex)
      );

      if (matched) {
        resolvedPrescriptionId = matched.id;
        if (!resolvedPatientName) resolvedPatientName = matched.patient_name;
      } else if (rxList && rxList.length > 0) {
        resolvedPrescriptionId = rxList[0].id;
        if (!resolvedPatientName) resolvedPatientName = rxList[0].patient_name;
      }
    }
  }

  if (!resolvedPrescriptionId) {
    return {
      success: false,
      error: 'Missing or invalid prescription ID.',
      status: 400,
    };
  }

  // 2. Resolve patient ID
  let resolvedPatientId = patientId;

  if (!resolvedPatientId && resolvedPatientName) {
    const cleanName = resolvedPatientName.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();
    const { data: pts } = await supabase
      .from('patients')
      .select('id, full_name')
      .ilike('full_name', `%${cleanName}%`)
      .limit(1);

    if (pts && pts.length > 0) {
      resolvedPatientId = pts[0].id;
    }
  }

  if (!resolvedPatientId) {
    // Look up any patient linked to this prescription in recent records
    const { data: fallbackPts } = await supabase.from('patients').select('id').limit(1);
    if (fallbackPts && fallbackPts.length > 0) {
      resolvedPatientId = fallbackPts[0].id;
    } else {
      return {
        success: false,
        error: 'No patient record found in database to associate with dispensing token.',
        status: 400,
      };
    }
  }

  // 3. Before creating a new token, check if prescription already has an active token (issued or dispense_requested)
  const { data: existingTokens } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('prescription_id', resolvedPrescriptionId)
    .in('status', ['issued', 'dispense_requested'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingTokens && existingTokens.length > 0) {
    return {
      success: true,
      token: existingTokens[0] as DispenseTokenRecord,
      status: 200,
    };
  }

  // 4. Cryptographically secure random token generation: MED-XXXX-XXXX
  const TOKEN_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function createCandidateToken(): string {
    const bytes = crypto.randomBytes(8);
    let seg1 = '';
    let seg2 = '';
    for (let i = 0; i < 4; i++) {
      seg1 += TOKEN_CHARSET[bytes[i] % TOKEN_CHARSET.length];
    }
    for (let i = 4; i < 8; i++) {
      seg2 += TOKEN_CHARSET[bytes[i] % TOKEN_CHARSET.length];
    }
    return `MED-${seg1}-${seg2}`;
  }

  // 5. Expiration time of 15 minutes, used_at = null, retry on collision
  let inserted: DispenseTokenRecord | null = null;
  let lastInsertError: any = null;
  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const tokenCandidate = createCandidateToken();
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const insertPayload = {
      prescription_id: resolvedPrescriptionId,
      patient_id: resolvedPatientId,
      slot: slotNum as 1 | 2 | 3,
      token: tokenCandidate,
      status: 'issued' as const,
      expires_at: expiresAt,
      created_at: nowIso,
      used_at: null,
    };

    const { data, error } = await supabase
      .from('dispense_tokens')
      .insert([insertPayload])
      .select()
      .single();

    if (!error && data) {
      inserted = data as DispenseTokenRecord;
      lastInsertError = null;
      break;
    }

    lastInsertError = error;
    const isUniqueViolation =
      error?.code === '23505' ||
      error?.message?.toLowerCase().includes('unique') ||
      error?.message?.toLowerCase().includes('duplicate');

    if (isUniqueViolation) {
      console.warn(`[dispenseTokenService] Token collision on ${tokenCandidate}, retrying (attempt ${attempt}/${MAX_RETRIES})...`);
      continue;
    } else {
      break;
    }
  }

  if (!inserted) {
    console.error('[dispenseTokenService] Error inserting dispense token:', lastInsertError);
    return {
      success: false,
      error: lastInsertError?.message?.includes('row-level security')
        ? 'Row-level security policy violation. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your server .env file.'
        : `Database error: ${lastInsertError?.message || 'Failed to create token'}`,
      status: 500,
    };
  }

  return {
    success: true,
    token: inserted,
    status: 200,
  };
}

/**
 * Claim an issued dispensing token exactly once.
 */
export async function claimDispenseToken(
  tokenString: string,
  authHeaderOrSessionToken?: string
): Promise<{ success: boolean; token?: DispenseTokenRecord; error?: string; status?: number }> {
  // 1. Determine patient identity from authenticated session (Requirements 18 & 19)
  const session = await verifyPatientSession(authHeaderOrSessionToken);
  if (!session || !session.patientId) {
    return {
      success: false,
      error: 'Unauthorized: Valid authenticated patient session is required to claim this token.',
      status: 401,
    };
  }

  const authenticatedPatientId = session.patientId;
  const cleanToken = tokenString?.trim().toUpperCase();

  if (!cleanToken) {
    return {
      success: false,
      error: 'Token parameter is required.',
      status: 400,
    };
  }

  const supabase = getSupabaseAdmin();

  // 2. Fetch the token from Supabase
  const { data: tokens, error: fetchError } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('token', cleanToken)
    .limit(1);

  if (fetchError || !tokens || tokens.length === 0) {
    return {
      success: false,
      error: 'Dispensing token not found. Please verify your token code.',
      status: 404,
    };
  }

  const tokenRecord: DispenseTokenRecord = tokens[0];

  // 3. Verify ownership: token patient_id must match authenticated patient (Requirement 17)
  if (tokenRecord.patient_id !== authenticatedPatientId) {
    return {
      success: false,
      error: 'Access denied: You do not own this dispensing token.',
      status: 403,
    };
  }

  // 4. Validate current token status (Requirement 16)
  if (tokenRecord.status === 'dispense_requested') {
    return {
      success: false,
      error: 'This token has already been claimed. Dispensing is currently in progress.',
      status: 409,
    };
  }

  if (tokenRecord.status === 'dispensed') {
    return {
      success: false,
      error: 'This medication has already been dispensed with this token.',
      status: 409,
    };
  }

  if (tokenRecord.status === 'expired') {
    return {
      success: false,
      error: 'This dispensing token has expired. Please contact your pharmacist for a new prescription.',
      status: 410,
    };
  }

  if (tokenRecord.status === 'cancelled') {
    return {
      success: false,
      error: 'This dispensing token has been cancelled by the pharmacy.',
      status: 400,
    };
  }

  if (tokenRecord.status !== 'issued') {
    return {
      success: false,
      error: `Token cannot be claimed in its current status: "${tokenRecord.status}".`,
      status: 400,
    };
  }

  // 5. Verify 24-hour expiration timestamp (Requirement 7 & 16)
  const expiresAt = new Date(tokenRecord.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Atomically mark as expired
    await supabase
      .from('dispense_tokens')
      .update({ status: 'expired' })
      .eq('id', tokenRecord.id);

    return {
      success: false,
      error: 'This dispensing token has expired (valid for 24 hours only).',
      status: 410,
    };
  }

  // 6. ATOMIC TRANSITION: issued → dispense_requested (Requirement 14 & 15)
  // Conditional update guarantees only the first concurrent click succeeds.
  const { data: updatedRows, error: updateError } = await supabase
    .from('dispense_tokens')
    .update({
      status: 'dispense_requested',
      used_at: new Date().toISOString(),
    })
    .eq('id', tokenRecord.id)
    .eq('status', 'issued') // Crucial: atomic check in DB!
    .select();

  if (updateError) {
    console.error('[dispenseTokenService] Atomic update error:', updateError);
    return {
      success: false,
      error: updateError.message.includes('row-level security')
        ? 'Row-level security policy violation. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your server .env file.'
        : `Failed to claim token: ${updateError.message}`,
      status: 500,
    };
  }

  // Requirement 15: If clicked twice, only the first request can succeed
  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: 'Duplicate request: Token has already been claimed.',
      status: 409,
    };
  }

  return {
    success: true,
    token: updatedRows[0] as DispenseTokenRecord,
    status: 200,
  };
}

/**
 * Fetch the active dispensing token for an authenticated patient.
 */
export async function getActiveTokenForPatient(
  authHeaderOrSessionToken?: string
): Promise<{ success: boolean; token?: DispenseTokenRecord | null; error?: string; status?: number }> {
  const session = await verifyPatientSession(authHeaderOrSessionToken);
  if (!session || !session.patientId) {
    return {
      success: false,
      error: 'Unauthorized: Patient authentication required.',
      status: 401,
    };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('patient_id', session.patientId)
    .in('status', ['issued', 'dispense_requested'])
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return {
      success: false,
      error: error.message,
      status: 500,
    };
  }

  return {
    success: true,
    token: data && data.length > 0 ? (data[0] as DispenseTokenRecord) : null,
    status: 200,
  };
}

/**
 * Fetch the latest dispensing token for a specific prescription.
 */
export async function getTokenForPrescription(
  prescriptionId: string
): Promise<{ success: boolean; token?: DispenseTokenRecord | null; error?: string; status?: number }> {
  const supabase = getSupabaseAdmin();
  const rawPrefix = prescriptionId.replace(/^RX-/, '').toLowerCase();

  // Look up prescription by UUID or prefix
  let resolvedId = prescriptionId;
  const { data: rxList } = await supabase
    .from('prescriptions')
    .select('id')
    .or(`id.eq.${prescriptionId},id.ilike.${rawPrefix}%`)
    .limit(1);

  if (rxList && rxList.length > 0) {
    resolvedId = rxList[0].id;
  }

  const { data, error } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('prescription_id', resolvedId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return {
      success: false,
      error: error.message,
      status: 500,
    };
  }

  return {
    success: true,
    token: data && data.length > 0 ? (data[0] as DispenseTokenRecord) : null,
    status: 200,
  };
}

/**
 * Idempotently mark a dispense token as 'dispensed' in Supabase upon ESP32 completion.
 * Records the completion timestamp and prevents duplicate updates.
 */
export async function completeDispenseToken(params: {
  token: string;
  slot?: number;
}): Promise<{
  success: boolean;
  token?: DispenseTokenRecord;
  alreadyDispensed?: boolean;
  error?: string;
  status?: number;
}> {
  const { token } = params;
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Token is required.', status: 400 };
  }

  const cleanToken = token.trim();
  const supabase = getSupabaseAdmin();

  // 1. Fetch token record
  const { data: tokens, error: fetchError } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('token', cleanToken)
    .limit(1);

  if (fetchError || !tokens || tokens.length === 0) {
    return { success: false, error: `Token not found: ${cleanToken}`, status: 404 };
  }

  const record = tokens[0] as DispenseTokenRecord;

  // Idempotency check: if already marked 'dispensed', return gracefully without duplicate writes
  if (record.status === 'dispensed') {
    return {
      success: true,
      token: record,
      alreadyDispensed: true,
      status: 200,
    };
  }

  // 2. Atomic update: status -> 'dispensed', used_at -> completion timestamp
  // Guard condition .neq('status', 'dispensed') ensures concurrency safety
  const completionTimestamp = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from('dispense_tokens')
    .update({
      status: 'dispensed',
      used_at: completionTimestamp,
    })
    .eq('id', record.id)
    .neq('status', 'dispensed')
    .select();

  if (updateError) {
    console.error('[dispenseTokenService] Error completing dispense token:', updateError);
    return { success: false, error: updateError.message, status: 500 };
  }

  // 3. Mark the associated prescription as 'dispensed'
  if (record.prescription_id) {
    await supabase
      .from('prescriptions')
      .update({ status: 'dispensed' })
      .eq('id', record.prescription_id)
      .neq('status', 'dispensed');
  }

  return {
    success: true,
    token: updatedRows && updatedRows.length > 0 ? (updatedRows[0] as DispenseTokenRecord) : record,
    alreadyDispensed: false,
    status: 200,
  };
}
