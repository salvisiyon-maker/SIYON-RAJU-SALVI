import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { RegisterPatientSchema } from '../validators/schemas.ts';
import { generatePatientId } from '../../utils/pure_logic.ts';

const router = Router();

// POST /api/patients - Register a new patient (Admin or Nurse)
router.post('/', authenticateToken, requireRoles('admin', 'nurse'), (req: Request, res: Response) => {
  const parseResult = RegisterPatientSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;

  // Check if email already registered
  const existingUser = db.users.findByEmail(data.email);
  if (existingUser) {
    res.status(400).json({ error: 'A user with this email address is already registered' });
    return;
  }

  // Generate unique Patient ID (e.g. VL-2026-X8K92L)
  let uniquePatientId = generatePatientId(2026);
  while (db.patients.findByPatientId(uniquePatientId)) {
    uniquePatientId = generatePatientId(2026);
  }

  // Generate temporary password
  const tempPassword = `VL@${Math.floor(1000 + Math.random() * 9000)}!`;
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  const userId = `usr-pat-${Date.now()}`;
  const patientRecordId = `pat-${Date.now()}`;
  const now = new Date().toISOString();

  // Create User
  const newUser = db.users.insert({
    id: userId,
    email: data.email,
    password_hash: passwordHash,
    role_id: 'patient',
    full_name: data.fullName,
    phone: data.phone,
    address: data.address,
    dob: data.dob,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
    must_change_password: true,
    failed_login_attempts: 0,
    created_at: now,
    updated_at: now,
  });

  // Create Patient Record
  const newPatient = db.patients.insert({
    id: patientRecordId,
    user_id: userId,
    patient_id: uniquePatientId,
    blood_group: data.bloodGroup,
    allergies: data.allergies || 'None reported',
    emergency_contact: data.emergencyContact,
    emergency_phone: data.emergencyPhone,
    registered_by_user_id: req.user!.id,
    created_at: now,
    updated_at: now,
  });

  // Send system notification
  db.notifications.insert({
    id: `notif-${Date.now()}`,
    user_id: userId,
    title: 'Registration Complete',
    message: `Welcome to VitalLink. Your Patient ID is ${uniquePatientId}. Please update your temporary password.`,
    type: 'system',
    is_read: false,
    link: '/profile',
    created_at: now,
  });

  logAudit(
    'REGISTER_PATIENT',
    'patient',
    patientRecordId,
    `${req.user!.fullName} registered new patient ${data.fullName} with ID ${uniquePatientId}`,
    req
  );

  // Return printable registration slip and credentials
  res.status(201).json({
    message: 'Patient registered successfully',
    patient: {
      id: newPatient.id,
      patientId: uniquePatientId,
      fullName: newUser.full_name,
      email: newUser.email,
      phone: newUser.phone,
      bloodGroup: newPatient.blood_group,
      allergies: newPatient.allergies,
      emergencyContact: newPatient.emergency_contact,
      emergencyPhone: newPatient.emergency_phone,
      temporaryPassword: tempPassword,
      mustChangePassword: true,
      registeredAt: now,
    },
  });
});

// GET /api/patients - List patients with search & pagination (Admin, Doctor, Nurse)
router.get('/', authenticateToken, requireRoles('admin', 'doctor', 'nurse'), (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);

  let allPatients = db.patients.find();

  // Join user info
  let enriched = allPatients.map((p) => {
    const user = db.users.findById(p.user_id);
    const visitCount = db.visits.find((v) => v.patient_id === p.id).length;
    return {
      id: p.id,
      userId: p.user_id,
      patientId: p.patient_id,
      fullName: user?.full_name || 'Unknown',
      email: user?.email || '',
      phone: user?.phone || '',
      dob: user?.dob || '',
      bloodGroup: p.blood_group,
      allergies: p.allergies,
      emergencyContact: p.emergency_contact,
      emergencyPhone: p.emergency_phone,
      avatarUrl: user?.avatar_url,
      visitCount,
      createdAt: p.created_at,
    };
  });

  if (query) {
    enriched = enriched.filter(
      (p) =>
        p.fullName.toLowerCase().includes(query) ||
        p.patientId.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone.toLowerCase().includes(query)
    );
  }

  // Sort newest first
  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = enriched.length;
  const start = (page - 1) * limit;
  const paginated = enriched.slice(start, start + limit);

  res.json({
    patients: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/patients/:id - Patient details with clinical history
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const patientIdOrCode = req.params.id;
  let patient = db.patients.findById(patientIdOrCode) || db.patients.findByPatientId(patientIdOrCode);

  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  // Strict Healthcare Isolation: Patients can only view their own record!
  if (req.user!.role === 'patient') {
    const ownPatient = db.patients.findByUserId(req.user!.id);
    if (!ownPatient || ownPatient.id !== patient.id) {
      logAudit('UNAUTHORIZED_ACCESS_ATTEMPT', 'patient', patient.id, `Patient tried viewing record of ${patient.id}`, req);
      res.status(403).json({ error: 'Access forbidden: You can only access your own medical records' });
      return;
    }
  }

  const user = db.users.findById(patient.user_id);
  const visits = db.visits.find((v) => v.patient_id === patient!.id);
  const prescriptions = db.prescriptions.find((p) => p.patient_id === patient!.id);
  const appointments = db.appointments.find((a) => a.patient_id === patient!.id);

  logAudit('VIEW_PATIENT', 'patient', patient.id, `${req.user!.fullName} viewed patient profile ${patient.patient_id}`, req);

  res.json({
    patient: {
      id: patient.id,
      patientId: patient.patient_id,
      fullName: user?.full_name,
      email: user?.email,
      phone: user?.phone,
      address: user?.address,
      dob: user?.dob,
      bloodGroup: patient.blood_group,
      allergies: patient.allergies,
      emergencyContact: patient.emergency_contact,
      emergencyPhone: patient.emergency_phone,
      avatarUrl: user?.avatar_url,
      registeredAt: patient.created_at,
    },
    counts: {
      visits: visits.length,
      prescriptions: prescriptions.length,
      appointments: appointments.length,
    },
  });
});

export default router;
