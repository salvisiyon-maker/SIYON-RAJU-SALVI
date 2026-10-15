import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { CreateVisitSchema, RecordVitalsSchema } from '../validators/schemas.ts';
import { checkMedicineAllergy } from '../../utils/pure_logic.ts';

const router = Router();

// GET /api/visits - List visit records
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { patientId, doctorId, startDate, endDate } = req.query;
  const user = req.user!;

  let visits = db.visits.find();

  // Patients can strictly only view their own visits
  if (user.role === 'patient') {
    const patient = db.patients.findByUserId(user.id);
    if (!patient) {
      res.json([]);
      return;
    }
    visits = visits.filter((v) => v.patient_id === patient.id);
  } else if (patientId) {
    visits = visits.filter((v) => v.patient_id === patientId);
  }

  if (doctorId) {
    visits = visits.filter((v) => v.doctor_id === doctorId);
  }

  if (startDate) {
    visits = visits.filter((v) => v.visit_date >= (startDate as string));
  }
  if (endDate) {
    visits = visits.filter((v) => v.visit_date <= (endDate as string) + 'T23:59:59.999Z');
  }

  // Enrich each visit with Doctor, Department, Patient info, Prescriptions, and Items
  const enriched = visits.map((v) => {
    const patient = db.patients.findById(v.patient_id);
    const patientUser = patient ? db.users.findById(patient.user_id) : null;
    const doctor = db.doctors.findById(v.doctor_id);
    const doctorUser = doctor ? db.users.findById(doctor.user_id) : null;
    const department = db.departments.findById(v.department_id);
    const nurse = v.nurse_id ? db.nurses.findById(v.nurse_id) : null;
    const nurseUser = nurse ? db.users.findById(nurse.user_id) : null;

    const prescription = db.prescriptions.findByVisitId(v.id);
    const prescriptionItems = prescription ? db.prescriptionItems.findByPrescriptionId(prescription.id) : [];

    return {
      ...v,
      patientName: patientUser?.full_name || 'Patient',
      patientCode: patient?.patient_id || 'N/A',
      patientAllergies: patient?.allergies,
      patientBloodGroup: patient?.blood_group,
      doctorName: doctorUser?.full_name || 'Dr. Doctor',
      doctorSpecialization: doctor?.specialization,
      departmentName: department?.name || 'General',
      nurseName: nurseUser?.full_name,
      prescription: prescription
        ? {
            ...prescription,
            items: prescriptionItems,
            patient: {
              fullName: patientUser?.full_name,
              patientCode: patient?.patient_id,
              bloodGroup: patient?.blood_group,
              allergies: patient?.allergies,
            },
            doctor: {
              fullName: doctorUser?.full_name,
              specialization: doctor?.specialization,
              licenseNo: doctor?.license_no,
              departmentName: department?.name,
            },
          }
        : null,
    };
  });

  // Timeline: newest first
  enriched.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

  res.json(enriched);
});

// GET /api/visits/:id
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const visit = db.visits.findById(req.params.id);
  if (!visit) {
    res.status(404).json({ error: 'Visit record not found' });
    return;
  }

  // Patient access check
  if (req.user!.role === 'patient') {
    const ownPatient = db.patients.findByUserId(req.user!.id);
    if (!ownPatient || ownPatient.id !== visit.patient_id) {
      res.status(403).json({ error: 'Access denied: You can only view your own records' });
      return;
    }
  }

  const patient = db.patients.findById(visit.patient_id);
  const patientUser = patient ? db.users.findById(patient.user_id) : null;
  const doctor = db.doctors.findById(visit.doctor_id);
  const doctorUser = doctor ? db.users.findById(doctor.user_id) : null;
  const department = db.departments.findById(visit.department_id);
  const prescription = db.prescriptions.findByVisitId(visit.id);
  const prescriptionItems = prescription ? db.prescriptionItems.findByPrescriptionId(prescription.id) : [];

  res.json({
    ...visit,
    patientName: patientUser?.full_name,
    patientCode: patient?.patient_id,
    patientAllergies: patient?.allergies,
    patientBloodGroup: patient?.blood_group,
    doctorName: doctorUser?.full_name,
    doctorSpecialization: doctor?.specialization,
    doctorLicense: doctor?.license_no,
    departmentName: department?.name,
    prescription: prescription
      ? {
          ...prescription,
          items: prescriptionItems,
        }
      : null,
  });
});

// POST /api/visits - Doctor creates visit record & prescribes medicines
router.post('/', authenticateToken, requireRoles('doctor', 'admin'), (req: Request, res: Response) => {
  const parseResult = CreateVisitSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;
  const patient = db.patients.findById(data.patientId);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  let doctorId = '';
  let deptId = '';

  if (req.user!.role === 'doctor') {
    const doc = db.doctors.findByUserId(req.user!.id);
    if (!doc) {
      res.status(400).json({ error: 'Doctor profile not found' });
      return;
    }
    doctorId = doc.id;
    deptId = doc.department_id;
  } else {
    // Admin creating visit record
    const firstDoc = db.doctors.find()[0];
    doctorId = firstDoc?.id || 'doc-priya';
    deptId = firstDoc?.department_id || 'dept-genmed';
  }

  // Allergy Check for any prescribed medicines!
  const allergyWarnings: string[] = [];
  if (data.medicines && data.medicines.length > 0) {
    for (const med of data.medicines) {
      const allergyCheck = checkMedicineAllergy(patient.allergies, med.medicineName);
      if (allergyCheck.isAllergic) {
        allergyWarnings.push(
          `ALLERGY WARNING: Patient is allergic to ${allergyCheck.matchedAllergy}. Prescribed: ${med.medicineName}`
        );
      }
    }
  }

  const visitId = `vis-${Date.now()}`;
  const now = new Date().toISOString();

  // Create Visit
  const newVisit = db.visits.insert({
    id: visitId,
    appointment_id: data.appointmentId || null,
    patient_id: data.patientId,
    doctor_id: doctorId,
    department_id: deptId,
    visit_date: now,
    symptoms: data.symptoms,
    diagnosis: data.diagnosis,
    vitals_bp: data.vitalsBp,
    vitals_pulse: data.vitalsPulse,
    vitals_temp: data.vitalsTemp,
    vitals_weight: data.vitalsWeight,
    vitals_spo2: data.vitalsSpo2,
    notes: data.notes,
    follow_up_date: data.followUpDate || null,
    created_at: now,
    updated_at: now,
  });

  // If appointment was linked, update appointment status to completed
  if (data.appointmentId) {
    db.appointments.update(data.appointmentId, { status: 'completed' });
  }

  // If medicines provided, create Prescription & Prescription Items
  let newPrescription = null;
  if (data.medicines && data.medicines.length > 0) {
    const rxId = `rx-${Date.now()}`;
    newPrescription = db.prescriptions.insert({
      id: rxId,
      visit_id: visitId,
      patient_id: data.patientId,
      doctor_id: doctorId,
      notes: `Prescribed during visit on ${now.slice(0, 10)}`,
      issued_at: now,
      created_at: now,
      updated_at: now,
    });

    data.medicines.forEach((item, index) => {
      db.prescriptionItems.insert({
        id: `rx-item-${Date.now()}-${index}`,
        prescription_id: rxId,
        medicine_name: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || 'After food',
        doctor_notes: item.doctorNotes || '',
        created_at: now,
      });
    });

    // Notify patient
    const patientUser = db.users.findById(patient.user_id);
    if (patientUser) {
      db.notifications.insert({
        id: `notif-${Date.now()}-pat`,
        user_id: patientUser.id,
        title: 'New Prescription Issued',
        message: `Your doctor has prescribed medications for your visit on ${now.slice(0, 10)}.`,
        type: 'prescription',
        is_read: false,
        link: '/patient/prescriptions',
        created_at: now,
      });
    }
  }

  logAudit(
    'RECORD_VISIT',
    'visit',
    visitId,
    `Doctor recorded visit & diagnosis for patient ${patient.patient_id}`,
    req
  );

  res.status(201).json({
    message: 'Visit and prescription recorded successfully',
    visit: newVisit,
    prescription: newPrescription,
    allergyWarnings: allergyWarnings.length > 0 ? allergyWarnings : undefined,
  });
});

// PATCH /api/visits/:id/vitals - Nurse records or updates vitals
router.patch('/:id/vitals', authenticateToken, requireRoles('nurse', 'doctor', 'admin'), (req: Request, res: Response) => {
  const parseResult = RecordVitalsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const visit = db.visits.findById(req.params.id);
  if (!visit) {
    res.status(404).json({ error: 'Visit record not found' });
    return;
  }

  const vitals = parseResult.data;
  let nurseId = visit.nurse_id;

  if (req.user!.role === 'nurse') {
    const nurse = db.nurses.findByUserId(req.user!.id);
    if (nurse) nurseId = nurse.id;
  }

  const updated = db.visits.update(visit.id, {
    vitals_bp: vitals.vitalsBp,
    vitals_pulse: vitals.vitalsPulse ?? visit.vitals_pulse,
    vitals_temp: vitals.vitalsTemp ?? visit.vitals_temp,
    vitals_weight: vitals.vitalsWeight ?? visit.vitals_weight,
    vitals_spo2: vitals.vitalsSpo2 ?? visit.vitals_spo2,
    nurse_id: nurseId,
    notes: vitals.notes ? `${visit.notes || ''} [Nurse Vitals Note: ${vitals.notes}]` : visit.notes,
  });

  logAudit('UPDATE_VITALS', 'visit', visit.id, `${req.user!.fullName} recorded patient vitals`, req);

  res.json({ message: 'Vitals updated successfully', visit: updated });
});

export default router;
