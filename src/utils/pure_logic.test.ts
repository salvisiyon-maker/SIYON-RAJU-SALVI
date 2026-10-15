import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePatientId,
  isValidPatientId,
  checkMedicineAllergy,
  isSlotConflicting,
  hasPermission,
} from './pure_logic.ts';

test('Patient ID generator produces valid format VL-2026-XXXXXX', () => {
  const id1 = generatePatientId(2026);
  const id2 = generatePatientId(2026);
  assert.equal(isValidPatientId(id1), true);
  assert.equal(isValidPatientId(id2), true);
  assert.notEqual(id1, id2);
  assert.match(id1, /^VL-2026-[0-9A-Z]{6}$/);
});

test('isValidPatientId validates correct and incorrect formats', () => {
  assert.equal(isValidPatientId('VL-2026-AB1289'), true);
  assert.equal(isValidPatientId('VL-2026-004812'), true);
  assert.equal(isValidPatientId('INVALID-ID'), false);
  assert.equal(isValidPatientId('VL-1999-123456'), false);
  assert.equal(isValidPatientId('VL-2026-12345'), false); // only 5 chars
});

test('checkMedicineAllergy catches exact and class cross-reactivity', () => {
  // Case 1: Direct match
  const res1 = checkMedicineAllergy(['Penicillin', 'Peanuts'], 'Penicillin V 500mg');
  assert.equal(res1.isAllergic, true);
  assert.equal(res1.severity, 'danger');

  // Case 2: Class match (Amoxicillin is in Penicillin class)
  const res2 = checkMedicineAllergy(['Penicillin'], 'Amoxicillin Trihydrate');
  assert.equal(res2.isAllergic, true);

  // Case 3: Comma separated string format
  const res3 = checkMedicineAllergy('Sulfa drugs, Aspirin', 'Bactrim DS');
  assert.equal(res3.isAllergic, true);

  // Case 4: Safe drug with no allergy
  const res4 = checkMedicineAllergy(['Penicillin'], 'Paracetamol 650mg');
  assert.equal(res4.isAllergic, false);
});

test('isSlotConflicting prevents doctor double booking', () => {
  const existingSlots = [
    {
      date: '2026-10-20',
      startTime: '10:00',
      endTime: '10:30',
      status: 'scheduled',
    },
    {
      date: '2026-10-20',
      startTime: '11:00',
      endTime: '11:30',
      status: 'cancelled', // Cancelled shouldn't conflict
    },
  ];

  // Exact overlap
  assert.equal(
    isSlotConflicting(existingSlots, {
      date: '2026-10-20',
      startTime: '10:00',
      endTime: '10:30',
    }),
    true
  );

  // Partial overlap
  assert.equal(
    isSlotConflicting(existingSlots, {
      date: '2026-10-20',
      startTime: '10:15',
      endTime: '10:45',
    }),
    true
  );

  // Conflict with cancelled slot should be false
  assert.equal(
    isSlotConflicting(existingSlots, {
      date: '2026-10-20',
      startTime: '11:00',
      endTime: '11:30',
    }),
    false
  );

  // Different date should not conflict
  assert.equal(
    isSlotConflicting(existingSlots, {
      date: '2026-10-21',
      startTime: '10:00',
      endTime: '10:30',
    }),
    false
  );
});

test('RBAC permissions verify authorized actions', () => {
  assert.equal(hasPermission('admin', 'users:write'), true);
  assert.equal(hasPermission('admin', 'reports:read'), true);

  assert.equal(hasPermission('doctor', 'prescriptions:write'), true);
  assert.equal(hasPermission('doctor', 'users:write'), false);

  assert.equal(hasPermission('nurse', 'visits:update_vitals'), true);
  assert.equal(hasPermission('nurse', 'prescriptions:write'), false);

  assert.equal(hasPermission('patient', 'patient:own_data'), true);
  assert.equal(hasPermission('patient', 'users:read'), false);
});
