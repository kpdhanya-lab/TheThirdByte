const { createClient } = require('../paitent-portal-frontend/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../pharmacist-portal-frontend/.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: rxList, error: rxErr } = await supabase
    .from('prescriptions')
    .select('id, patient_name, hospital_code, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent prescriptions:', rxList);

  const { data: tokenList, error: tokenErr } = await supabase
    .from('dispense_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent dispense tokens:', tokenList);

  const { data: patientList, error: pErr } = await supabase
    .from('patients')
    .select('id, full_name, phone, hospital_code')
    .limit(10);
  console.log('Patients in DB:', patientList);
}

inspect();
