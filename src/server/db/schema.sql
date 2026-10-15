-- ============================================================================
-- VitalLink: End-to-End Healthcare Appointment and Staff Coordination
-- PostgreSQL Relational Database Schema
-- Follows healthcare data protection standards (India DPDP Act / HIPAA)
-- ============================================================================

-- Extensions (if available in PG)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  head_doctor_id VARCHAR(50),
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  dob DATE,
  avatar_url TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 4. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  patient_id VARCHAR(30) NOT NULL UNIQUE, -- Format: VL-2026-XXXXXX
  blood_group VARCHAR(10),
  allergies TEXT, -- Comma-separated or JSON list of known drug/food allergies
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(30),
  registered_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);

-- 5. DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id VARCHAR(50) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  specialization VARCHAR(100) NOT NULL,
  license_no VARCHAR(50) NOT NULL UNIQUE,
  consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
  availability_schedule TEXT, -- JSON schedule string
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);

-- 6. NURSES
CREATE TABLE IF NOT EXISTS nurses (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id VARCHAR(50) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  ward VARCHAR(50) NOT NULL,
  shift_preference VARCHAR(30) DEFAULT 'Day', -- Day, Evening, Night
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(50) PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id VARCHAR(50) NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  department_id VARCHAR(50) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- scheduled, checked_in, in_consultation, completed, cancelled, no_show
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);

-- 8. VISITS
CREATE TABLE IF NOT EXISTS visits (
  id VARCHAR(50) PRIMARY KEY,
  appointment_id VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id VARCHAR(50) NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  nurse_id VARCHAR(50) REFERENCES nurses(id) ON DELETE SET NULL,
  department_id VARCHAR(50) REFERENCES departments(id) ON DELETE RESTRICT,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  symptoms TEXT NOT NULL,
  diagnosis TEXT,
  vitals_bp VARCHAR(20),     -- e.g., '120/80 mmHg'
  vitals_pulse INTEGER,      -- e.g., 72 bpm
  vitals_temp NUMERIC(4, 1), -- e.g., 98.6 °F
  vitals_weight NUMERIC(5, 1),-- e.g., 68.5 kg
  vitals_spo2 INTEGER,       -- e.g., 99 %
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);

-- 9. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR(50) PRIMARY KEY,
  visit_id VARCHAR(50) NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id VARCHAR(50) NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  notes TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions(visit_id);

-- 10. PRESCRIPTION_ITEMS
CREATE TABLE IF NOT EXISTS prescription_items (
  id VARCHAR(50) PRIMARY KEY,
  prescription_id VARCHAR(50) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name VARCHAR(150) NOT NULL,
  dosage VARCHAR(50) NOT NULL,       -- e.g., '500 mg', '10 ml'
  frequency VARCHAR(50) NOT NULL,    -- e.g., 'Once daily', 'Twice daily (1-0-1)'
  duration VARCHAR(50) NOT NULL,     -- e.g., '5 days', '1 month'
  instructions VARCHAR(100),         -- e.g., 'After food', 'Before sleep'
  doctor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_items_prescription ON prescription_items(prescription_id);

-- 11. SHIFTS
CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,         -- 'doctor', 'nurse'
  department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, swapped, cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, shift_date);

-- 12. TASKS (Coordination)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  assigned_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  due_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id, status);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'system', -- appointment, prescription, task, system, alert
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 14. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,      -- VIEW_PATIENT, EDIT_PRESCRIPTION, REGISTER_PATIENT, etc.
  entity_type VARCHAR(50) NOT NULL,  -- patient, visit, prescription, user
  entity_id VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
