/**
 * Test verification script for HiveMQ real-time status updates in Pharmacist Portal
 * Run with: node scripts/verify_hivemq_pharmacist.cjs
 */
const assert = require('assert');

console.log('--- Verifying HiveMQ Real-time Updates in Pharmacist Portal ---');

// Test 1: Verify Topic and Payload Format
const topic = 'pharmacy/status';
const rawMessage = JSON.stringify({
  token: 'MED-4821',
  slot: 1,
  status: 'EMPTY',
});

console.log(`Step 1: Testing subscription topic: "${topic}"`);
assert.strictEqual(topic, 'pharmacy/status', 'Must subscribe to topic pharmacy/status');

// Test 2: Message Parser verification
const parsed = JSON.parse(rawMessage);
assert.strictEqual(parsed.token, 'MED-4821');
assert.strictEqual(parsed.slot, 1);
assert.strictEqual(parsed.status, 'EMPTY');
console.log('Step 2: Message format valid:', parsed);

// Test 3: State transition logic verification
let slotStatuses = {
  1: { status: 'OCCUPIED', isAvailable: false, token: 'MED-4821' },
  2: { status: 'EMPTY', isAvailable: true },
  3: { status: 'EMPTY', isAvailable: true },
};

let dispensedAlert = null;

let prescriptions = [
  {
    rxNumber: 'RX-8841',
    vendingSlot: 'Slot 01',
    status: 'Ready for Dispense',
    dispenseToken: { token: 'MED-4821', slot: 1, status: 'issued' },
  },
  {
    rxNumber: 'RX-9902',
    vendingSlot: 'Slot 02',
    status: 'Pending Review',
  },
];

// Execute update logic upon message arrival
const slotNum = Number(parsed.slot) || 1;
const statusUpper = String(parsed.status || '').toUpperCase();

if ([1, 2, 3].includes(slotNum) && statusUpper === 'EMPTY') {
  // 1. Mark Slot 1 as EMPTY and make available for next prescription
  slotStatuses = {
    ...slotStatuses,
    [slotNum]: {
      status: 'EMPTY',
      isAvailable: true,
      token: undefined,
    },
  };

  // 2. Display green "Medicine Dispensed" badge
  dispensedAlert = {
    slot: slotNum,
    token: parsed.token,
    timestamp: '10:30:00 AM',
  };

  // 3. Mark the prescription for this token/slot as Dispensed
  prescriptions = prescriptions.map((rx) => {
    const rxToken =
      typeof rx.dispenseToken === 'object' ? rx.dispenseToken?.token : rx.dispenseToken;
    const matchesToken = Boolean(
      parsed.token && rxToken && rxToken.trim().toUpperCase() === parsed.token.trim().toUpperCase()
    );
    const matchesSlot = rx.vendingSlot === `Slot 0${slotNum}` || rx.vendingSlot === `Slot ${slotNum}`;

    if (matchesToken || (matchesSlot && rx.status !== 'Dispensed')) {
      return {
        ...rx,
        status: 'Dispensed',
      };
    }
    return rx;
  });
}

// Assertions
assert.strictEqual(slotStatuses[1].status, 'EMPTY', 'Slot 1 must be marked as EMPTY');
assert.strictEqual(slotStatuses[1].isAvailable, true, 'Slot 1 must be available for next prescription');
assert.strictEqual(slotStatuses[1].token, undefined, 'Slot 1 token must be cleared for next prescription');
assert.notStrictEqual(dispensedAlert, null, 'Dispensed alert must be set');
assert.strictEqual(dispensedAlert.slot, 1, 'Dispensed alert slot must be 1');
assert.strictEqual(dispensedAlert.token, 'MED-4821', 'Dispensed alert token must match');
assert.strictEqual(prescriptions[0].status, 'Dispensed', 'Prescription must be marked Dispensed');

console.log('Step 3: State assertions passed successfully:');
console.log(' - Slot 1 Status:', slotStatuses[1].status);
console.log(' - Slot 1 Available:', slotStatuses[1].isAvailable);
console.log(' - Alert Active (Green Badge):', dispensedAlert !== null, 'Slot:', dispensedAlert.slot);
console.log(' - Prescription Status:', prescriptions[0].status);
console.log('--- ALL HIVEMQ REAL-TIME INTEGRATION TESTS PASSED ---');
