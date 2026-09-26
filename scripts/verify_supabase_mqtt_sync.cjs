/**
 * Verification test for Supabase synchronization upon MQTT message on pharmacy/status
 * Run with: node scripts/verify_supabase_mqtt_sync.cjs
 */
const { createClient } = require('../paitent-portal-frontend/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Read env
const envPath = path.resolve(__dirname, '../pharmacist-portal-frontend/.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://rjpigsvmxyvpjcbkxidt.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory deduplication set simulating the implementation in src/utils/supabase.ts
const inProgressTokens = new Set();
const processedTokens = new Set();

async function syncDispenseCompletion(token, slot) {
  const cleanToken = token.trim();
  if (inProgressTokens.has(cleanToken) || processedTokens.has(cleanToken)) {
    console.log(`[Deduplication Guard] Duplicate MQTT message for token ${cleanToken} caught in-memory.`);
    return { success: true, alreadyDispensed: true };
  }

  inProgressTokens.add(cleanToken);

  try {
    // 1. Find corresponding row in dispense_tokens using token
    const { data: existingRecords, error: fetchErr } = await supabase
      .from('dispense_tokens')
      .select('id, token, prescription_id, status, used_at')
      .eq('token', cleanToken)
      .limit(1);

    if (fetchErr) {
      throw fetchErr;
    }

    const existingRecord = existingRecords?.[0];
    if (!existingRecord) {
      return { success: false, error: 'Token not found' };
    }

    // 2. Prevent duplicate updates if already dispensed
    if (existingRecord.status === 'dispensed') {
      console.log(`[Database Guard] Token ${cleanToken} already has status='dispensed' (used_at: ${existingRecord.used_at}). Duplicate update prevented.`);
      processedTokens.add(cleanToken);
      return { success: true, alreadyDispensed: true };
    }

    // 3. Update status = 'dispensed' and used_at = current timestamp
    const currentTimestamp = new Date().toISOString();
    const { data: updatedRows, error: updateErr } = await supabase
      .from('dispense_tokens')
      .update({
        status: 'dispensed',
        used_at: currentTimestamp,
      })
      .eq('token', cleanToken)
      .neq('status', 'dispensed')
      .select();

    if (updateErr) throw updateErr;

    processedTokens.add(cleanToken);
    return { success: true, alreadyDispensed: false, updated: updatedRows?.[0] };
  } finally {
    inProgressTokens.delete(cleanToken);
  }
}

async function runTest() {
  console.log('=== Testing Supabase Synchronization from MQTT pharmacy/status ===');

  const testTokenString = 'TEST-SYNC-' + Math.floor(10000 + Math.random() * 90000);
  const testSlot = 1;

  // 1. Create a test dispense_token record with status: 'issued', used_at: null
  console.log(`Step 1: Inserting test dispense_token record (${testTokenString})...`);
  const { data: created, error: createErr } = await supabase
    .from('dispense_tokens')
    .insert({
      prescription_id: '237073cc-abdd-4cc2-a99d-6a9b975f5776',
      patient_id: '55a1b9a9-c2ad-48fb-8e98-d779c5776381',
      slot: testSlot,
      token: testTokenString,
      status: 'issued',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      used_at: null,
    })
    .select()
    .single();

  if (createErr) {
    console.error('Error setting up test token:', createErr);
    process.exit(1);
  }

  assert.strictEqual(created.status, 'issued');
  assert.strictEqual(created.used_at, null);
  console.log('Step 1 Passed: Test record created with status="issued", used_at=null');

  // 2. Simulate MQTT message arrival on pharmacy/status
  console.log(`Step 2: Simulating MQTT message on pharmacy/status for token ${testTokenString}...`);
  const firstSyncResult = await syncDispenseCompletion(testTokenString, testSlot);
  assert.strictEqual(firstSyncResult.success, true);
  assert.strictEqual(firstSyncResult.alreadyDispensed, false);
  console.log('Step 2 Passed: Sync succeeded.');

  // Verify in database that row has status='dispensed' and used_at is populated
  const { data: verified, error: verifyErr } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('token', testTokenString)
    .single();

  assert(!verifyErr);
  assert.strictEqual(verified.status, 'dispensed', 'Status must be updated to dispensed');
  assert(verified.used_at !== null, 'used_at timestamp must be updated with current timestamp');
  console.log(`Step 2 Verification: In database, status="${verified.status}", used_at="${verified.used_at}"`);

  // 3. Simulate DUPLICATE MQTT message on pharmacy/status
  console.log('Step 3: Simulating duplicate MQTT message reception for same token...');
  const duplicateSyncResult = await syncDispenseCompletion(testTokenString, testSlot);
  assert.strictEqual(duplicateSyncResult.success, true);
  assert.strictEqual(duplicateSyncResult.alreadyDispensed, true, 'Duplicate must be detected and prevented');
  console.log('Step 3 Passed: Duplicate update successfully prevented by in-memory deduplication.');

  // Also test duplicate protection when memory cache is cleared (simulating another client / fresh session)
  processedTokens.clear();
  console.log('Step 4: Testing database-level idempotency protection (bypassing in-memory cache)...');
  const dbDuplicateResult = await syncDispenseCompletion(testTokenString, testSlot);
  assert.strictEqual(dbDuplicateResult.success, true);
  assert.strictEqual(dbDuplicateResult.alreadyDispensed, true, 'Database check must prevent duplicate update');

  // Verify used_at did not change
  const { data: reverified } = await supabase
    .from('dispense_tokens')
    .select('used_at')
    .eq('token', testTokenString)
    .single();

  assert.strictEqual(reverified.used_at, verified.used_at, 'used_at timestamp must remain unchanged on duplicate delivery');
  console.log('Step 4 Passed: Timestamp preserved, zero redundant writes.');

  // Clean up test token
  await supabase.from('dispense_tokens').delete().eq('token', testTokenString);
  console.log('Step 5: Cleaned up test data.');
  console.log('=== ALL SUPABASE SYNCHRONIZATION TESTS PASSED ===');
}

runTest();
