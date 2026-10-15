import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../db/index.ts';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.ts';
import { checkMedicineAllergy, isSlotConflicting, hasPermission } from '../../utils/pure_logic.ts';

test('Auth System: Demo credentials verify and hash correctly', () => {
  const admin = db.users.findByEmail('admin@vitallink.com');
  assert.ok(admin, 'Admin account should exist in seed data');
  assert.equal(admin.role_id, 'admin');
  assert.equal(bcrypt.compareSync('Admin@123', admin.password_hash), true);

  const doc = db.users.findByEmail('dr.priya@vitallink.com');
  assert.ok(doc, 'Doctor account should exist in seed data');
  assert.equal(doc.role_id, 'doctor');
  assert.equal(bcrypt.compareSync('Doctor@123', doc.password_hash), true);

  const patient = db.patients.findByPatientId('VL-2026-004812');
  assert.ok(patient, 'Patient with VL-2026-004812 should exist');
  const patientUser = db.users.findById(patient.user_id);
  assert.ok(patientUser);
  assert.equal(bcrypt.compareSync('Patient@123', patientUser.password_hash), true);
});

test('RBAC System: Role hierarchy and permissions enforce proper access', () => {
  assert.equal(hasPermission('admin', 'users:write'), true);
  assert.equal(hasPermission('doctor', 'prescriptions:write'), true);
  assert.equal(hasPermission('nurse', 'visits:update_vitals'), true);
  assert.equal(hasPermission('patient', 'patient:own_data'), true);

  // Cross-role negative checks
  assert.equal(hasPermission('patient', 'users:write'), false);
  assert.equal(hasPermission('nurse', 'prescriptions:write'), false);
  assert.equal(hasPermission('doctor', 'users:write'), false);
});

test('Prescriptions & Allergy System: Detects allergen warnings', () => {
  // Ananya is allergic to Penicillin & Peanuts
  const patient = db.patients.findByPatientId('VL-2026-004812');
  assert.ok(patient);

  const warning1 = checkMedicineAllergy(patient.allergies, 'Amoxicillin Clavulanate 625mg');
  assert.equal(warning1.isAllergic, true);
  assert.equal(warning1.severity, 'danger');

  const warning2 = checkMedicineAllergy(patient.allergies, 'Paracetamol 500mg');
  assert.equal(warning2.isAllergic, false);
});

test('Appointments: Collision detector prevents doctor double-booking', () => {
  const existing = [
    {
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '10:30',
      status: 'scheduled',
    },
  ];

  // Overlapping slot
  const conflict = isSlotConflicting(existing, {
    date: '2026-10-25',
    startTime: '10:15',
    endTime: '10:45',
  });
  assert.equal(conflict, true);

  // Non-overlapping slot
  const noConflict = isSlotConflicting(existing, {
    date: '2026-10-25',
    startTime: '10:30',
    endTime: '11:00',
  });
  assert.equal(noConflict, false);
});

test('Open Website Registration: Self-registration creates valid patient and credentials', () => {
  const testEmail = `newpatient.${Date.now()}@example.com`;
  const rawPass = 'SecretPass@2026';
  const passHash = bcrypt.hashSync(rawPass, 10);
  const newUserId = `usr-test-${Date.now()}`;
  const now = new Date().toISOString();

  // Create user
  db.users.insert({
    id: newUserId,
    email: testEmail,
    password_hash: passHash,
    role_id: 'patient',
    full_name: 'Test Self-Registered User',
    phone: '+91 99999 11111',
    created_at: now,
    updated_at: now,
    failed_login_attempts: 0,
    must_change_password: false,
  });

  // Create patient with generated ID
  const testPatientCode = `VL-2026-T${Math.floor(10000 + Math.random() * 90000)}`;
  const patientRecord = db.patients.insert({
    id: `pat-test-${Date.now()}`,
    user_id: newUserId,
    patient_id: testPatientCode,
    blood_group: 'AB+',
    allergies: 'Aspirin',
    created_at: now,
    updated_at: now,
  });

  // Verify finding by new custom email and verifying password
  const fetchedUser = db.users.findByEmail(testEmail);
  assert.ok(fetchedUser, 'Newly registered user should be queryable by email');
  assert.equal(bcrypt.compareSync(rawPass, fetchedUser.password_hash), true);

  // Verify finding by new custom patient ID
  const fetchedPatient = db.patients.findByPatientId(testPatientCode);
  assert.ok(fetchedPatient, 'Newly registered patient should be queryable by Patient ID');
  assert.equal(fetchedPatient.user_id, newUserId);
  assert.equal(fetchedPatient.blood_group, 'AB+');

  // Verify case-insensitive lookup
  const lowerCaseLookup = db.patients.findByPatientId(testPatientCode.toLowerCase());
  assert.ok(lowerCaseLookup, 'Patient ID lookup must be case-insensitive');
  assert.equal(lowerCaseLookup.id, fetchedPatient.id);
});

test('Open Website Registration: Self-registered Doctor account can authenticate', () => {
  const docEmail = `dr.custom.${Date.now()}@example.com`;
  const rawPass = 'DocSecure@2026';
  const passHash = bcrypt.hashSync(rawPass, 10);
  const docUserId = `usr-doc-${Date.now()}`;
  const now = new Date().toISOString();

  db.users.insert({
    id: docUserId,
    email: docEmail,
    password_hash: passHash,
    role_id: 'doctor',
    full_name: 'Dr. Custom Surgeon',
    phone: '+91 98888 22222',
    created_at: now,
    updated_at: now,
    failed_login_attempts: 0,
    must_change_password: false,
  });

  db.doctors.insert({
    id: `doc-custom-${Date.now()}`,
    user_id: docUserId,
    department_id: 'dept-genmed',
    specialization: 'Orthopedics',
    license_no: `MCI-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    consultation_fee: 750,
    is_available: true,
    created_at: now,
    updated_at: now,
  });

  const foundDocUser = db.users.findByEmail(docEmail);
  assert.ok(foundDocUser, 'Custom doctor user should be findable');
  assert.equal(bcrypt.compareSync(rawPass, foundDocUser.password_hash), true);

  const docRecord = db.doctors.findByUserId(foundDocUser.id);
  assert.ok(docRecord, 'Custom doctor record should exist');
  assert.equal(docRecord.specialization, 'Orthopedics');

  // Verify access token generation for custom doctor
  const token = generateAccessToken({
    id: foundDocUser.id,
    email: foundDocUser.email,
    role: foundDocUser.role_id,
    fullName: foundDocUser.full_name,
    doctorId: docRecord.id,
  });
  assert.ok(token, 'Access token generated successfully for custom doctor');
});

