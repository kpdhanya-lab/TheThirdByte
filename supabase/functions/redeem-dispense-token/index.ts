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

// HMAC Secret for patient session tokens (must match server secret)
const SESSION_SECRET = Deno.env.get("SESSION_SECRET") ?? "thethirdbyte-secure-dispense-session-secret-2026";

/**
 * Verify HMAC-SHA256 signature on signed patient session tokens.
 */
async function verifyHmacSession(tokenString: string): Promise<{ patientId: string; phone?: string } | null> {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, signatureHex] = parts;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert hex signature back to bytes
    const sigBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      sigBytes,
      encoder.encode(dataB64)
    );

    if (!isValid) return null;

    // Decode base64url payload
    const jsonStr = new TextDecoder().decode(
      Uint8Array.from(atob(dataB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
    );
    const payload = JSON.parse(jsonStr);

    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired session
    }

    if (payload.patientId) {
      return { patientId: payload.patientId, phone: payload.phone };
    }
  } catch {
    // Session parse / crypto error
  }
  return null;
}

serve(async (req: Request) => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only POST method accepted
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // -------------------------------------------------------------------------
    // 1. SERVICE KEY (Service Role Only - Never Anon)
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
    // 2. AUTHENTICATION: Verify Authenticated Patient
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

    const rawToken = authHeader.replace("Bearer ", "").trim();
    let verifiedPatientId: string | null = null;

    // A. Check if it is a Supabase Auth JWT
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(rawToken);

    if (!authError && userData?.user) {
      const authUser = userData.user;
      // Resolve patient ID by user ID or phone
      const { data: patientRows } = await supabaseAdmin
        .from("patients")
        .select("id")
        .or(`id.eq.${authUser.id},phone.eq.${authUser.phone || ""}`)
        .limit(1);

      if (patientRows && patientRows.length > 0) {
        verifiedPatientId = patientRows[0].id;
      } else {
        verifiedPatientId = authUser.id;
      }
    }

    // B. Check if it is a signed HMAC patient session token
    if (!verifiedPatientId) {
      const session = await verifyHmacSession(rawToken);
      if (session) {
        verifiedPatientId = session.patientId;
      }
    }

    if (!verifiedPatientId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid or expired patient session token.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 3. INPUT VALIDATION: Parse & Validate Token Parameter
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

    const { token } = body || {};

    if (!token || typeof token !== "string" || !token.trim()) {
      return new Response(
        JSON.stringify({
          error: "Invalid input: 'token' is required and must be a non-empty string.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanToken = token.trim();

    // -------------------------------------------------------------------------
    // 4. FETCH DISPENSE TOKEN RECORD
    // -------------------------------------------------------------------------
    const { data: tokenRows, error: tokenErr } = await supabaseAdmin
      .from("dispense_tokens")
      .select("id, token, prescription_id, patient_id, slot, status, expires_at, used_at")
      .eq("token", cleanToken)
      .limit(1);

    if (tokenErr || !tokenRows || tokenRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: `Dispense token not found: ${cleanToken}`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenRecord = tokenRows[0];

    // -------------------------------------------------------------------------
    // 5. VERIFY TOKEN BELONGS TO AUTHENTICATED PATIENT
    // -------------------------------------------------------------------------
    if (tokenRecord.patient_id !== verifiedPatientId) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: You are not authorized to redeem this dispensing token.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 6. VERIFY EXPIRATION
    // -------------------------------------------------------------------------
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({
          error: "Dispense token has expired. Please contact pharmacy staff for re-issuance.",
          expires_at: tokenRecord.expires_at,
          status: "expired",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 7. VERIFY STATUS IS 'issued' (Reject Already Claimed / Dispensed / Cancelled)
    // -------------------------------------------------------------------------
    if (tokenRecord.status !== "issued") {
      let message = `Token cannot be redeemed. Current status is '${tokenRecord.status}'.`;
      if (tokenRecord.status === "dispense_requested") {
        message = "Dispensing has already been requested for this token.";
      } else if (tokenRecord.status === "dispensed") {
        message = "Medication has already been dispensed.";
      }

      return new Response(
        JSON.stringify({
          error: message,
          current_status: tokenRecord.status,
          slot: tokenRecord.slot,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 8. ATOMIC STATUS UPDATE & DUPLICATE CLICK PREVENTION:
    // Update status from 'issued' -> 'dispense_requested' and set used_at.
    // Concurrency guard: .eq('status', 'issued') ensures only 1 click can ever succeed.
    // -------------------------------------------------------------------------
    const nowIso = now.toISOString();

    const { data: updatedRecord, error: updateErr } = await supabaseAdmin
      .from("dispense_tokens")
      .update({
        status: "dispense_requested",
        used_at: nowIso,
      })
      .eq("id", tokenRecord.id)
      .eq("status", "issued") // Atomic guard: fails if already changed concurrently
      .select("id, token, prescription_id, patient_id, slot, status, expires_at, used_at")
      .maybeSingle();

    if (updateErr || !updatedRecord) {
      return new Response(
        JSON.stringify({
          error: "Conflict: This token was already claimed or is currently being processed.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // 9. SUCCESS RESPONSE:
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        message: `Dispensing requested successfully for Slot ${updatedRecord.slot}.`,
        token: updatedRecord.token,
        prescription_id: updatedRecord.prescription_id,
        patient_id: updatedRecord.patient_id,
        slot: updatedRecord.slot,
        status: updatedRecord.status,
        expires_at: updatedRecord.expires_at,
        used_at: updatedRecord.used_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Internal server error during token redemption.",
        details: err?.message || String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
