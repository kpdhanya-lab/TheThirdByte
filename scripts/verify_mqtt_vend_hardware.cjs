/**
 * Verification test for MQTT Vend Hardware Integration
 * Run with: node scripts/verify_mqtt_vend_hardware.cjs
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const patientEnvPath = path.resolve(__dirname, '../paitent-portal-frontend/.env');
const patientEnv = fs.readFileSync(patientEnvPath, 'utf8');
assert.ok(patientEnv.includes('wss://f2523d8277e7475882f3a75123b3a093.s1.eu.hivemq.cloud:8884/mqtt'), 'Patient portal .env must have the real cluster URL');
assert.ok(!patientEnv.includes('YOUR_BROKER'), 'Patient portal .env must not have YOUR_BROKER');
console.log(' PASS: Patient portal .env has valid broker URL');

// Check pharmacist portal .env
const pharmacistEnvPath = path.resolve(__dirname, '../pharmacist-portal-frontend/.env');
const pharmacistEnv = fs.readFileSync(pharmacistEnvPath, 'utf8');
assert.ok(pharmacistEnv.includes('wss://f2523d8277e7475882f3a75123b3a093.s1.eu.hivemq.cloud:8884/mqtt'), 'Pharmacist portal .env must have the real cluster URL');
assert.ok(!pharmacistEnv.includes('YOUR_BROKER'), 'Pharmacist portal .env must not have YOUR_BROKER');
console.log(' PASS: Pharmacist portal .env has valid broker URL');

console.log('\n=== Step 2: Testing Broker Connection Over Secure WebSockets ===');
const brokerUrl = 'wss://f2523d8277e7475882f3a75123b3a093.s1.eu.hivemq.cloud:8884/mqtt';
const mqtt = require('../paitent-portal-frontend/node_modules/mqtt');
const client = mqtt.connect(brokerUrl, {
  username: 'test100',
  password: 'test@100',
  connectTimeout: 5000,
  clean: true,
});

const receivedMessages = [];
const testTokenId = 'MED-' + Math.floor(1000 + Math.random() * 9000);

client.on('connect', () => {
  console.log(' PASS: Connected successfully to HiveMQ broker over WSS');

  console.log('\n=== Step 3: Subscribing to Topic pharmacy/dispense ===');
  client.subscribe('pharmacy/dispense', (subErr) => {
    assert.ifError(subErr);
    console.log(' PASS: Subscribed to pharmacy/dispense');

    console.log('\n=== Step 4: Simulating Vend Trigger Publish ===');
    const payload = JSON.stringify({
      token: testTokenId,
      slot: 1,
      action: 'DISPENSE',
      timestamp: new Date().toISOString(),
    });

    console.log(' Publishing to pharmacy/dispense:');
    console.log(' Payload:', payload);

    client.publish('pharmacy/dispense', payload, (pubErr) => {
      assert.ifError(pubErr);
      console.log(' PASS: Message published and acknowledged by broker');
    });
  });
});

client.on('message', (topic, message) => {
  const text = message.toString();
  console.log(`\n Message received on [${topic}]:`, text);
  receivedMessages.push({ topic, text });

  if (topic === 'pharmacy/dispense') {
    const parsed = JSON.parse(text);
    if (parsed.token === testTokenId) {
      console.log(' PASS: Message structure verified:');
      console.log('  - token:', parsed.token);
      console.log('  - slot:', parsed.slot);
      console.log('  - action:', parsed.action);
      console.log('  - timestamp:', parsed.timestamp);

      // Verify no duplicate message within 1.5 seconds
      setTimeout(() => {
        const matches = receivedMessages.filter((m) => m.text.includes(testTokenId));
        assert.strictEqual(matches.length, 1, `Expected exactly 1 message for token ${testTokenId}, but received ${matches.length}`);
        console.log('\n PASS: Exactly 1 message received (Zero duplicates verified)');
        console.log('\n=== ALL HARDWARE INTEGRATION VERIFICATION TESTS PASSED ===');
        client.end();
        process.exit(0);
      }, 1500);
    }
  }
});

client.on('error', (err) => {
  console.error('FAIL: Client error:', err);
  process.exit(1);
});
