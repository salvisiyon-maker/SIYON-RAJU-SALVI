import { db } from '../src/server/db/index.ts';

console.log('Seeding VitalLink Healthcare database...');
const seeded = db.resetToSeed();
console.log(`Seeding complete! Loaded:
- ${seeded.roles.length} Roles (admin, doctor, nurse, patient)
- ${seeded.departments.length} Medical Departments
- ${seeded.users.length} Users with bcrypt hashed credentials
- ${seeded.patients.length} Patients (Demo IDs: VL-2026-004812, VL-2026-009134, VL-2026-007255)
- ${seeded.doctors.length} Doctors (Dr. Priya Sharma, Dr. Rajesh Kulkarni)
- ${seeded.nurses.length} Nurses (Nurse Sunita Patil, Nurse Rahul Deshmukh)
- ${seeded.appointments.length} Sample Appointments
- ${seeded.visits.length} Clinical Visits with Recorded Vitals
- ${seeded.prescriptions.length} Prescriptions with Multi-Drug Items
- ${seeded.shifts.length} Staff Shifts
- ${seeded.tasks.length} Clinical Tasks
- ${seeded.notifications.length} In-App Notifications
- ${seeded.audit_logs.length} Audit Trail Records
`);
