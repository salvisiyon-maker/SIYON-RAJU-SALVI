export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  head_doctor_id?: string | null;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role_id: string;
  full_name: string;
  phone?: string;
  address?: string;
  dob?: string;
  avatar_url?: string;
  must_change_password?: boolean;
  failed_login_attempts: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PatientRecord {
  id: string;
  user_id: string;
  patient_id: string; // VL-2026-XXXXXX
  blood_group?: string;
  allergies?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  registered_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DoctorRecord {
  id: string;
  user_id: string;
  department_id: string;
  specialization: string;
  license_no: string;
  consultation_fee: number;
  availability_schedule: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface NurseRecord {
  id: string;
  user_id: string;
  department_id: string;
  ward: string;
  shift_preference: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VisitRecord {
  id: string;
  appointment_id?: string | null;
  patient_id: string;
  doctor_id: string;
  nurse_id?: string | null;
  department_id: string;
  visit_date: string;
  symptoms: string;
  diagnosis?: string;
  vitals_bp?: string;
  vitals_pulse?: number;
  vitals_temp?: number;
  vitals_weight?: number;
  vitals_spo2?: number;
  notes?: string;
  follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PrescriptionRecord {
  id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  notes?: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PrescriptionItemRecord {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  doctor_notes?: string;
  created_at: string;
}

export interface ShiftRecord {
  id: string;
  user_id: string;
  role: 'doctor' | 'nurse';
  department_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'swapped' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface TaskRecord {
  id: string;
  assigned_by_user_id: string;
  assigned_to_user_id: string;
  patient_id?: string | null;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_time?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'task' | 'system' | 'alert';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface DatabaseSchema {
  roles: RoleRecord[];
  departments: DepartmentRecord[];
  users: UserRecord[];
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  nurses: NurseRecord[];
  appointments: AppointmentRecord[];
  visits: VisitRecord[];
  prescriptions: PrescriptionRecord[];
  prescription_items: PrescriptionItemRecord[];
  shifts: ShiftRecord[];
  tasks: TaskRecord[];
  notifications: NotificationRecord[];
  audit_logs: AuditLogRecord[];
}
