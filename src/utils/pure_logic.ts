/**
 * Pure business logic utilities for VitalLink healthcare system.
 * Decoupled from UI and DB to allow fast deterministic unit testing.
 */

export interface PatientAllergyCheck {
  patientAllergies: string[];
  prescribedMedicine: string;
}

/**
 * Checks if a prescribed medicine matches any of the patient's known allergies.
 * Supports exact matching, case-insensitive comparison, and substring/class containment.
 */
export function checkMedicineAllergy(allergies: string[] | string | null | undefined, medicineName: string): {
  isAllergic: boolean;
  matchedAllergy?: string;
  severity: 'none' | 'warning' | 'danger';
} {
  if (!allergies || !medicineName) {
    return { isAllergic: false, severity: 'none' };
  }

  const allergyList = Array.isArray(allergies)
    ? allergies
    : allergies.split(',').map((s) => s.trim());

  const cleanMed = medicineName.trim().toLowerCase();

  for (const allergy of allergyList) {
    const cleanAllergy = allergy.trim().toLowerCase();
    if (!cleanAllergy) continue;

    // Direct match or partial match (e.g. "Penicillin" matches "Amoxicillin (Penicillin class)" or "Penicillin V")
    if (cleanMed.includes(cleanAllergy) || cleanAllergy.includes(cleanMed)) {
      return {
        isAllergic: true,
        matchedAllergy: allergy.trim(),
        severity: 'danger',
      };
    }

    // Common antibiotic cross-reactivity mapping
    const antibioticClasses: Record<string, string[]> = {
      penicillin: ['amoxicillin', 'ampicillin', 'augmentin', 'penicillin', 'piperacillin'],
      sulfa: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfadiazine'],
      nsaid: ['ibuprofen', 'aspirin', 'naproxen', 'diclofenac'],
    };

    for (const [group, drugs] of Object.entries(antibioticClasses)) {
      if (cleanAllergy.includes(group)) {
        if (drugs.some((d) => cleanMed.includes(d))) {
          return {
            isAllergic: true,
            matchedAllergy: `${allergy.trim()} (${group.toUpperCase()} class)`,
            severity: 'danger',
          };
        }
      }
    }
  }

  return { isAllergic: false, severity: 'none' };
}

/**
 * Generates a unique, non-guessable Patient ID in format: VL-2026-XXXXXX
 * Where XXXXXX is an uppercase alphanumeric string (or 6 digits).
 */
export function generatePatientId(year: number = 2026): string {
  // Generate 6 random characters avoiding ambiguous chars
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomPart += chars[randomIndex];
  }
  return `VL-${year}-${randomPart}`;
}

/**
 * Validates whether a given string is a valid Patient ID format
 */
export function isValidPatientId(id: string): boolean {
  return /^VL-20\d{2}-[0-9A-Z]{6}$/.test(id.trim());
}

/**
 * Validates if an appointment time slot overlaps with an existing appointment for the same doctor.
 */
export interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status?: string;
}

export function isSlotConflicting(existingSlots: TimeSlot[], newSlot: TimeSlot): boolean {
  const parseMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const newStart = parseMinutes(newSlot.startTime);
  const newEnd = parseMinutes(newSlot.endTime);

  for (const existing of existingSlots) {
    // Only check slots on the same date and not cancelled
    if (existing.date !== newSlot.date) continue;
    if (existing.status === 'cancelled' || existing.status === 'no_show') continue;

    const existStart = parseMinutes(existing.startTime);
    const existEnd = parseMinutes(existing.endTime);

    // Overlap condition: startA < endB && startB < endA
    if (newStart < existEnd && existStart < newEnd) {
      return true;
    }
  }

  return false;
}

/**
 * RBAC authorization matrix helper
 */
export type Role = 'admin' | 'doctor' | 'nurse' | 'patient';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'users:read', 'users:write',
    'patients:read', 'patients:write',
    'doctors:read', 'doctors:write',
    'nurses:read', 'nurses:write',
    'departments:read', 'departments:write',
    'shifts:read', 'shifts:write',
    'reports:read',
    'audit:read',
    'appointments:read', 'appointments:write',
  ],
  doctor: [
    'appointments:read', 'appointments:write',
    'patients:read',
    'visits:read', 'visits:write',
    'prescriptions:read', 'prescriptions:write',
    'tasks:read', 'tasks:write',
    'shifts:read',
  ],
  nurse: [
    'patients:read',
    'appointments:read', 'appointments:update_status',
    'visits:read', 'visits:update_vitals',
    'tasks:read', 'tasks:write',
    'shifts:read',
  ],
  patient: [
    'patient:own_data',
    'appointments:own_read', 'appointments:own_book', 'appointments:own_cancel',
    'prescriptions:own_read',
    'visits:own_read',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
