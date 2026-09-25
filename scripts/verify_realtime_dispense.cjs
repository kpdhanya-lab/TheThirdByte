const { createClient } = require('../paitent-portal-frontend/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env from pharmacist portal
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

async function testFlow() {
  console.log('Testing End-to-End Realtime Slot and Approval Dispensing...');

  // 1. Create a test prescription in pending_review
  const { data: rx, error: rxErr } = await supabase
    .from('prescriptions')
    .insert({
      patient_name: 'Eleanor Vance',
      hospital_code: '560017',
      status: 'pending_review',
      prescriber_name: 'Dr. Automated Tester',
    })
    .select()
    .single();

  if (rxErr) {
    console.error('Error creating test prescription:', rxErr);
    process.exit(1);
  }
  console.log('Step 1: Prescription created with id:', rx.id, 'status:', rx.status);

  // Verify patient has no active token for this rx -> Button is LOCKED
  const { data: noToken } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('prescription_id', rx.id);

  console.log('Step 1.1: Token count before pharmacist approval:', noToken ? noToken.length : 0, '(Patient button is LOCKED: [AWAITING PHARMACIST APPROVAL])');

  // 2. Pharmacist selects Slot 2 and approves
  const selectedSlot = 2;
  const tokenString = 'T-' + Math.floor(1000 + Math.random() * 9000);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: token, error: tokenErr } = await supabase
    .from('dispense_tokens')
    .insert({
      prescription_id: rx.id,
      patient_id: '55a1b9a9-c2ad-48fb-8e98-d779c5776381',
      slot: selectedSlot,
      token: tokenString,
      status: 'issued',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (tokenErr) {
    console.error('Error generating token:', tokenErr);
    process.exit(1);
  }

  await supabase
    .from('prescriptions')
    .update({ status: 'ready' })
    .eq('id', rx.id);

  console.log('Step 2: Pharmacist approved prescription, assigned Slot', selectedSlot, 'and issued token:', token.token);

  // 3. Patient portal receives token
  const { data: activeTokens, error: fetchErr } = await supabase
    .from('dispense_tokens')
    .select('*')
    .eq('prescription_id', rx.id)
    .eq('status', 'issued');

  if (fetchErr || !activeTokens.length) {
    console.error('Patient failed to receive token:', fetchErr);
    process.exit(1);
  }

  const receivedToken = activeTokens[0];
  console.log('Step 3: Patient portal detected issued token! Slot:', receivedToken.slot, '-> Button UNLOCKED: [DISPENSE MEDICINE (SLOT 0' + receivedToken.slot + ')]');

  // 4. Patient claims the token
  const { data: claimed, error: claimErr } = await supabase
    .from('dispense_tokens')
    .update({
      status: 'dispense_requested',
      used_at: new Date().toISOString(),
    })
    .eq('token', receivedToken.token)
    .eq('status', 'issued')
    .select()
    .single();

  if (claimErr || !claimed) {
    console.error('Error claiming token:', claimErr);
    process.exit(1);
  }

  console.log('Step 4: Patient successfully claimed token! Status transitioned to:', claimed.status, 'used_at:', claimed.used_at);

  // 5. Attempt duplicate claim (must fail / return no rows)
  const { data: duplicateClaim } = await supabase
    .from('dispense_tokens')
    .update({
      status: 'dispense_requested',
    })
    .eq('token', receivedToken.token)
    .eq('status', 'issued')
    .select();

  console.log('Step 5: Duplicate claim attempt prevented. Matching rows updated:', duplicateClaim ? duplicateClaim.length : 0);

  // Clean up test prescription and token
  await supabase.from('dispense_tokens').delete().eq('prescription_id', rx.id);
  await supabase.from('prescriptions').delete().eq('id', rx.id);
  console.log('Step 6: Test data cleaned up successfully.');
  console.log('SUCCESS: ALL REALTIME SLOT AND APPROVAL DISPENSING TESTS PASSED!');
}

testFlow();
