import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or Patient ID is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['admin', 'doctor', 'nurse', 'patient']).optional(),
  rememberMe: z.boolean().optional(),
});

export const SelfRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'doctor', 'nurse', 'patient']),
  phone: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  // Patient fields
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  // Doctor fields
  specialization: z.string().optional(),
  licenseNo: z.string().optional(),
  departmentId: z.string().optional(),
  // Nurse fields
  ward: z.string().optional(),
  shiftPreference: z.string().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  avatarUrl: z.string().optional(),
  // Role-specific
  specialization: z.string().optional(),
  licenseNo: z.string().optional(),
  ward: z.string().optional(),
  shiftPreference: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const RegisterPatientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Phone number is required'),
  dob: z.string().min(4, 'Date of birth is required'),
  gender: z.string().optional(),
  address: z.string().min(3, 'Address is required'),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  allergies: z.string().optional(),
  emergencyContact: z.string().min(2, 'Emergency contact person is required'),
  emergencyPhone: z.string().min(8, 'Emergency contact phone is required'),
});

export const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor is required'),
  patientId: z.string().optional(), // If booked by patient, inferred from session
  departmentId: z.string().min(1, 'Department is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time format must be HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time format must be HH:mm'),
  reason: z.string().min(3, 'Reason for visit is required'),
  notes: z.string().optional(),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show']),
  notes: z.string().optional(),
});

export const RecordVitalsSchema = z.object({
  vitalsBp: z.string().min(1, 'Blood Pressure is required (e.g. 120/80)'),
  vitalsPulse: z.number().int().positive().optional(),
  vitalsTemp: z.number().positive().optional(),
  vitalsWeight: z.number().positive().optional(),
  vitalsSpo2: z.number().int().min(50).max(100).optional(),
  notes: z.string().optional(),
});

export const CreateVisitSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  patientId: z.string().min(1, 'Patient ID is required'),
  symptoms: z.string().min(3, 'Symptoms are required'),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  vitalsBp: z.string().optional(),
  vitalsPulse: z.number().optional(),
  vitalsTemp: z.number().optional(),
  vitalsWeight: z.number().optional(),
  vitalsSpo2: z.number().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional().nullable(),
  medicines: z.array(
    z.object({
      medicineName: z.string().min(1, 'Medicine name is required'),
      dosage: z.string().min(1, 'Dosage is required'),
      frequency: z.string().min(1, 'Frequency is required'),
      duration: z.string().min(1, 'Duration is required'),
      instructions: z.string().optional(),
      doctorNotes: z.string().optional(),
    })
  ).optional(),
});

export const CreatePrescriptionSchema = z.object({
  visitId: z.string().min(1, 'Visit ID is required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      medicineName: z.string().min(1, 'Medicine name is required'),
      dosage: z.string().min(1, 'Dosage is required'),
      frequency: z.string().min(1, 'Frequency is required'),
      duration: z.string().min(1, 'Duration is required'),
      instructions: z.string().optional(),
      doctorNotes: z.string().optional(),
    })
  ).min(1, 'At least one medicine item is required'),
});

export const CreateShiftSchema = z.object({
  userId: z.string().min(1, 'Staff user is required'),
  role: z.enum(['doctor', 'nurse']),
  departmentId: z.string().optional().nullable(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time format must be HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time format must be HH:mm'),
  notes: z.string().optional(),
});

export const CreateTaskSchema = z.object({
  assignedToUserId: z.string().min(1, 'Assignee is required'),
  patientId: z.string().optional().nullable(),
  title: z.string().min(3, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueTime: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
});
