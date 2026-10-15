import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { CreatePrescriptionSchema } from '../validators/schemas.ts';
import { checkMedicineAllergy } from '../../utils/pure_logic.ts';

const router = Router();

// POST /api/prescriptions/check-allergy - Real-time allergy warning checker for doctors
router.post('/check-allergy', authenticateToken, requireRoles('doctor', 'admin'), (req: Request, res: Response) => {
  const { patientId, medicineName } = req.body;
  if (!patientId || !medicineName) {
    res.status(400).json({ error: 'patientId and medicineName required' });
    return;
  }

  const patient = db.patients.findById(patientId);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  const result = checkMedicineAllergy(patient.allergies, medicineName);
  res.json(result);
});

// GET /api/prescriptions - List prescriptions
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { patientId } = req.query;
  const user = req.user!;

  let prescriptions = db.prescriptions.find();

  // Strict isolation for patient
  if (user.role === 'patient') {
    const ownPatient = db.patients.findByUserId(user.id);
    if (!ownPatient) {
      res.json([]);
      return;
    }
    prescriptions = prescriptions.filter((p) => p.patient_id === ownPatient.id);
  } else if (patientId) {
    prescriptions = prescriptions.filter((p) => p.patient_id === patientId);
  }

  // Enrich with items and metadata
  const enriched = prescriptions.map((p) => {
    const items = db.prescriptionItems.findByPrescriptionId(p.id);
    const visit = db.visits.findById(p.visit_id);
    const patient = db.patients.findById(p.patient_id);
    const patientUser = patient ? db.users.findById(patient.user_id) : null;
    const doctor = db.doctors.findById(p.doctor_id);
    const doctorUser = doctor ? db.users.findById(doctor.user_id) : null;
    const department = doctor ? db.departments.findById(doctor.department_id) : null;

    return {
      ...p,
      items,
      diagnosis: visit?.diagnosis || 'General Consultation',
      symptoms: visit?.symptoms || '',
      vitals: {
        bp: visit?.vitals_bp,
        pulse: visit?.vitals_pulse,
        temp: visit?.vitals_temp,
        weight: visit?.vitals_weight,
        spo2: visit?.vitals_spo2,
      },
      patient: {
        id: patient?.id,
        patientCode: patient?.patient_id,
        fullName: patientUser?.full_name,
        bloodGroup: patient?.blood_group,
        allergies: patient?.allergies,
        dob: patientUser?.dob,
        phone: patientUser?.phone,
      },
      doctor: {
        id: doctor?.id,
        fullName: doctorUser?.full_name,
        specialization: doctor?.specialization,
        licenseNo: doctor?.license_no,
        departmentName: department?.name,
      },
    };
  });

  // Sort newest first
  enriched.sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());

  res.json(enriched);
});

// GET /api/prescriptions/:id - Single prescription for PDF/print view
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const p = db.prescriptions.findById(req.params.id);
  if (!p) {
    res.status(404).json({ error: 'Prescription not found' });
    return;
  }

  // Strict patient access check
  if (req.user!.role === 'patient') {
    const ownPatient = db.patients.findByUserId(req.user!.id);
    if (!ownPatient || ownPatient.id !== p.patient_id) {
      res.status(403).json({ error: 'Access denied: You can only view your own prescriptions' });
      return;
    }
  }

  const items = db.prescriptionItems.findByPrescriptionId(p.id);
  const visit = db.visits.findById(p.visit_id);
  const patient = db.patients.findById(p.patient_id);
  const patientUser = patient ? db.users.findById(patient.user_id) : null;
  const doctor = db.doctors.findById(p.doctor_id);
  const doctorUser = doctor ? db.users.findById(doctor.user_id) : null;
  const department = doctor ? db.departments.findById(doctor.department_id) : null;

  logAudit(
    'VIEW_PRESCRIPTION',
    'prescription',
    p.id,
    `${req.user!.fullName} viewed prescription #${p.id} for patient ${patient?.patient_id}`,
    req
  );

  res.json({
    ...p,
    items,
    diagnosis: visit?.diagnosis,
    symptoms: visit?.symptoms,
    vitals: {
      bp: visit?.vitals_bp,
      pulse: visit?.vitals_pulse,
      temp: visit?.vitals_temp,
      weight: visit?.vitals_weight,
      spo2: visit?.vitals_spo2,
    },
    patient: {
      id: patient?.id,
      patientCode: patient?.patient_id,
      fullName: patientUser?.full_name,
      bloodGroup: patient?.blood_group,
      allergies: patient?.allergies,
      dob: patientUser?.dob,
      phone: patientUser?.phone,
      address: patientUser?.address,
    },
    doctor: {
      id: doctor?.id,
      fullName: doctorUser?.full_name,
      specialization: doctor?.specialization,
      licenseNo: doctor?.license_no,
      departmentName: department?.name,
    },
  });
});

// POST /api/prescriptions - Doctor creates prescription
router.post('/', authenticateToken, requireRoles('doctor', 'admin'), (req: Request, res: Response) => {
  const parseResult = CreatePrescriptionSchema.safeParse(req.body);
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
  if (req.user!.role === 'doctor') {
    const doc = db.doctors.findByUserId(req.user!.id);
    doctorId = doc?.id || 'doc-priya';
  } else {
    const firstDoc = db.doctors.find()[0];
    doctorId = firstDoc?.id || 'doc-priya';
  }

  // Allergy warning check on each item
  const allergyWarnings: string[] = [];
  data.items.forEach((item) => {
    const check = checkMedicineAllergy(patient.allergies, item.medicineName);
    if (check.isAllergic) {
      allergyWarnings.push(
        `Patient is allergic to ${check.matchedAllergy}! Prescribed: ${item.medicineName}`
      );
    }
  });

  const rxId = `rx-${Date.now()}`;
  const now = new Date().toISOString();

  const prescription = db.prescriptions.insert({
    id: rxId,
    visit_id: data.visitId,
    patient_id: data.patientId,
    doctor_id: doctorId,
    notes: data.notes || '',
    issued_at: now,
    created_at: now,
    updated_at: now,
  });

  data.items.forEach((item, index) => {
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

  logAudit(
    'CREATE_PRESCRIPTION',
    'prescription',
    rxId,
    `Doctor created prescription with ${data.items.length} items for patient ${patient.patient_id}`,
    req
  );

  res.status(201).json({
    message: 'Prescription created successfully',
    prescription,
    allergyWarnings: allergyWarnings.length > 0 ? allergyWarnings : undefined,
  });
});

export default router;
