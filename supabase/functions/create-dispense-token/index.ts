import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// =============================================================================
// CORS Configuration
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * Unambiguous uppercase alphanumeric character set (excluding 0, O, 1, I).
 * Length: 32 characters (5 bits of entropy per character).
 */
const TOKEN_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a cryptographically secure, human-readable dispensing token.
 * Format: MED-XXXX-XXXX (e.g. MED-7K4P-9X2Q)
 * Uses Web Crypto API crypto.getRandomValues(). Never uses Math.random().
 */
function generateSecureDispenseToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let seg1 = "";
  let seg2 = "";
  for (let i = 0; i < 4; i++) {
    seg1 += TOKEN_CHARSET[bytes[i] % TOKEN_CHARSET.length];
  }
  for (let i = 4; i < 8; i++) {
    seg2 += TOKEN_CHARSET[bytes[i] % TOKEN_CHARSET.length];
  }
  return `MED-${seg1}-${seg2}`;
}

serve(async (req: Request) => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Reject unsupported HTTP methods
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // -------------------------------------------------------------------------
    // 1. SERVICE KEY SECURITY (Service Role Only - No Anon Fallback)
    // -------------------------------------------------------------------------
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? "https://rjpigsvmxyvpjcbkxidt.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required and missing.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // -------------------------------------------------------------------------
    // 2. PHARMACIST AUTHENTICATION & AUTHORIZATION (JWT / Session Only)
    // Trust ONLY the authenticated Supabase JWT. No header-spoofing allowed.
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Missing or invalid Bearer authentication token.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwtToken = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(jwtToken);

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid or expired authentication token.",
          details: authError?.message,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    let isAuthorized = false;

    // Verify role in JWT claims / metadata
    const role = (
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      ""
    ).toLowerCase();

    if (role.includes("pharmacist") || role.includes("admin")) {
      isAuthorized = true;
    } else {
      // Check if user is linked to an active pharmacist profile in the database
      const { data: pharm } = await supabaseAdmin
        .from("pharmacists")
        .select("id, role, is_active")
        .or(`id.eq.${user.id},pharmacist_id.eq.${user.user_metadata?.pharmacist_id || ""}`)
        .eq("is_active", true)
        .limit(1);

      if (pharm && pharm.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Caller is not an authorized pharmacist or administrator.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 3. INPUT VALIDATION (HTTP 400 for invalid input)
    // -------------------------------------------------------------------------
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Request body must be a valid JSON object." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prescription_id, slot } = body;

    if (!prescription_id || typeof prescription_id !== "string" || !prescription_id.trim()) {
      return new Response(
        JSON.stringify({
          error: "Invalid input: 'prescription_id' is required and must be a non-empty string.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slotNumber = Number(slot);
    if (!Number.isInteger(slotNumber) || ![1, 2, 3].includes(slotNumber)) {
      return new Response(
        JSON.stringify({
          error: "Invalid input: 'slot' must be 1, 2, or 3.",
          received_slot: slot,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 4. PRESCRIPTION VERIFICATION & STATUS CHECK
    // -------------------------------------------------------------------------
    const cleanRxId = prescription_id.replace(/^RX-/i, "").trim();

    let rxQuery = supabaseAdmin
      .from("prescriptions")
      .select("id, patient_name, status, created_at, raw_extracted_json");

    if (cleanRxId.includes("-") && cleanRxId.length === 36) {
      rxQuery = rxQuery.eq("id", cleanRxId);
    } else {
      rxQuery = rxQuery.or(`id.eq.${prescription_id},id.ilike.${cleanRxId}%`);
    }

    const { data: rxRows, error: rxErr } = await rxQuery.limit(1);

    if (rxErr || !rxRows || rxRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: `Prescription not found for identifier: ${prescription_id}`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prescription = rxRows[0];
    const currentStatus = (prescription.status || "").toLowerCase().trim();
    const approvedStatuses = ["verified", "ready", "approved", "ready for dispense"];

    if (!approvedStatuses.includes(currentStatus)) {
      return new Response(
        JSON.stringify({
          error: `Prescription has not been approved yet. Current status: '${prescription.status}'. Only approved prescriptions can receive a dispensing token.`,
          prescription_id: prescription.id,
          current_status: prescription.status,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currentStatus === "dispensed") {
      return new Response(
        JSON.stringify({
          error: "Prescription has already been dispensed.",
          prescription_id: prescription.id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 5. PATIENT RESOLUTION (From Prescription Only - Never Fallback to First Patient)
    // -------------------------------------------------------------------------
    let resolvedPatientId: string | null = null;

    // Check direct foreign key / embedded fields on prescription
    if ((prescription as any).patient_id) {
      resolvedPatientId = (prescription as any).patient_id;
    } else if (prescription.raw_extracted_json && typeof prescription.raw_extracted_json === "object") {
      resolvedPatientId = (prescription.raw_extracted_json as any).patient_id || null;
    }

    // Match patient strictly via prescription's patient_name
    if (!resolvedPatientId && prescription.patient_name) {
      const cleanName = prescription.patient_name
        .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
        .trim();

      const { data: patientRows } = await supabaseAdmin
        .from("patients")
        .select("id, full_name")
        .ilike("full_name", `%${cleanName}%`)
        .limit(1);

      if (patientRows && patientRows.length > 0) {
        resolvedPatientId = patientRows[0].id;
      }
    }

    // If prescription cannot resolve a patient, fail immediately with 422
    if (!resolvedPatientId) {
      return new Response(
        JSON.stringify({
          error: "Patient could not be resolved from prescription.",
          prescription_id: prescription.id,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 6. ACTIVE TOKEN CHECK & IDEMPOTENCY
    // -------------------------------------------------------------------------
    const now = new Date();
    const { data: existingTokens } = await supabaseAdmin
      .from("dispense_tokens")
      .select("token, prescription_id, patient_id, slot, status, expires_at")
      .eq("prescription_id", prescription.id)
      .in("status", ["issued", "dispense_requested"])
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingTokens && existingTokens.length > 0) {
      const existing = existingTokens[0];
      return new Response(
        JSON.stringify({
          token: existing.token,
          prescription_id: existing.prescription_id,
          patient_id: existing.patient_id,
          slot: existing.slot,
          status: existing.status,
          expires_at: existing.expires_at,
          existing: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 7. CRYPTOGRAPHIC TOKEN GENERATION & PERSISTENCE
    // 15-minute TTL, UNIQUE collision retry loop
    // -------------------------------------------------------------------------
    let insertedRecord = null;
    let lastError: any = null;
    const MAX_RETRIES = 5;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const tokenCandidate = generateSecureDispenseToken();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins

      const { data, error } = await supabaseAdmin
        .from("dispense_tokens")
        .insert({
          prescription_id: prescription.id,
          patient_id: resolvedPatientId,
          slot: slotNumber,
          token: tokenCandidate,
          status: "issued",
          expires_at: expiresAt,
          created_at: createdAt.toISOString(),
          used_at: null,
        })
        .select("token, prescription_id, patient_id, slot, status, expires_at")
        .single();

      if (!error && data) {
        insertedRecord = data;
        lastError = null;
        break;
      }

      lastError = error;
      const isUniqueViolation =
        error?.code === "23505" ||
        error?.message?.toLowerCase().includes("unique") ||
        error?.message?.toLowerCase().includes("duplicate");

      if (isUniqueViolation) {
        console.warn(
          `Token collision on candidate '${tokenCandidate}'. Regenerating (attempt ${attempt}/${MAX_RETRIES})...`
        );
        continue;
      } else {
        break;
      }
    }

    if (!insertedRecord) {
      return new Response(
        JSON.stringify({
          error: "Failed to create dispensing token.",
          details: lastError?.message || "Maximum collision retries exceeded.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 8. SUCCESS RESPONSE
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        token: insertedRecord.token,
        prescription_id: insertedRecord.prescription_id,
        patient_id: insertedRecord.patient_id,
        slot: insertedRecord.slot,
        status: insertedRecord.status,
        expires_at: insertedRecord.expires_at,
        existing: false,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Internal server error processing dispense token request.",
        details: err?.message || String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
