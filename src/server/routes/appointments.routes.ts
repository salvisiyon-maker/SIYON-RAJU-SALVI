import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, logAudit } from '../middleware/auth.ts';
import { CreateAppointmentSchema, UpdateAppointmentStatusSchema } from '../validators/schemas.ts';
import { isSlotConflicting } from '../../utils/pure_logic.ts';

const router = Router();

// GET /api/appointments - List appointments with filters
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { date, doctorId, status, departmentId } = req.query;
  const user = req.user!;

  let list = db.appointments.find();

  // If patient, restrict strictly to their own appointments
  if (user.role === 'patient') {
    const patient = db.patients.findByUserId(user.id);
    if (!patient) {
      res.json([]);
      return;
    }
    list = list.filter((a) => a.patient_id === patient.id);
  } else if (user.role === 'doctor') {
    const doc = db.doctors.findByUserId(user.id);
    if (doc && !req.query.all) {
      list = list.filter((a) => a.doctor_id === doc.id);
    }
  }

  // Filter params
  if (date) {
    list = list.filter((a) => a.date === date);
  }
  if (doctorId) {
    list = list.filter((a) => a.doctor_id === doctorId);
  }
  if (status) {
    list = list.filter((a) => a.status === status);
  }
  if (departmentId) {
    list = list.filter((a) => a.department_id === departmentId);
  }

  // Enrich with patient and doctor details
  const enriched = list.map((a) => {
    const patient = db.patients.findById(a.patient_id);
    const patientUser = patient ? db.users.findById(patient.user_id) : null;
    const doctor = db.doctors.findById(a.doctor_id);
    const doctorUser = doctor ? db.users.findById(doctor.user_id) : null;
    const department = db.departments.findById(a.department_id);

    return {
      ...a,
      patientName: patientUser?.full_name || 'Unknown Patient',
      patientCode: patient?.patient_id || 'N/A',
      patientPhone: patientUser?.phone,
      patientAllergies: patient?.allergies,
      doctorName: doctorUser?.full_name || 'Unknown Doctor',
      doctorSpecialization: doctor?.specialization,
      departmentName: department?.name || 'General',
    };
  });

  // Sort by date and start_time
  enriched.sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));

  res.json(enriched);
});

// POST /api/appointments - Book a new appointment
router.post('/', authenticateToken, (req: Request, res: Response) => {
  const parseResult = CreateAppointmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;
  let targetPatientId = data.patientId;

  if (req.user!.role === 'patient') {
    const ownPatient = db.patients.findByUserId(req.user!.id);
    if (!ownPatient) {
      res.status(400).json({ error: 'Patient profile not linked' });
      return;
    }
    targetPatientId = ownPatient.id;
  } else if (!targetPatientId) {
    res.status(400).json({ error: 'Patient ID is required' });
    return;
  }

  const patient = db.patients.findById(targetPatientId);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  const doctor = db.doctors.findById(data.doctorId);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' });
    return;
  }

  // Double-booking check: prevent conflict for doctor
  const existingDoctorAppointments = db.appointments
    .find((a) => a.doctor_id === data.doctorId && a.date === data.date)
    .map((a) => ({
      date: a.date,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
    }));

  const hasConflict = isSlotConflicting(existingDoctorAppointments, {
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  if (hasConflict) {
    res.status(409).json({
      error: `Doctor is already booked for this time slot on ${data.date} (${data.startTime} - ${data.endTime}). Please select an alternate time.`,
    });
    return;
  }

  const newAppointmentId = `apt-${Date.now()}`;
  const now = new Date().toISOString();

  const appointment = db.appointments.insert({
    id: newAppointmentId,
    patient_id: targetPatientId,
    doctor_id: data.doctorId,
    department_id: data.departmentId,
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime,
    status: 'scheduled',
    reason: data.reason,
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  });

  // Notify Doctor
  const doctorUser = db.users.findById(doctor.user_id);
  const patientUser = db.users.findById(patient.user_id);

  if (doctorUser) {
    db.notifications.insert({
      id: `notif-${Date.now()}-doc`,
      user_id: doctorUser.id,
      title: 'New Appointment Booked',
      message: `${patientUser?.full_name} booked consultation for ${data.date} at ${data.startTime}.`,
      type: 'appointment',
      is_read: false,
      link: '/doctor/appointments',
      created_at: now,
    });
  }

  logAudit(
    'BOOK_APPOINTMENT',
    'appointment',
    newAppointmentId,
    `${req.user!.fullName} booked appointment with ${doctorUser?.full_name} for ${data.date} ${data.startTime}`,
    req
  );

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment,
  });
});

// PATCH /api/appointments/:id/status - Update status flow
router.patch('/:id/status', authenticateToken, (req: Request, res: Response) => {
  const parseResult = UpdateAppointmentStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const appointment = db.appointments.findById(req.params.id);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const { status, notes } = parseResult.data;

  // Patient can only cancel their own scheduled appointment
  if (req.user!.role === 'patient') {
    const ownPatient = db.patients.findByUserId(req.user!.id);
    if (!ownPatient || ownPatient.id !== appointment.patient_id) {
      res.status(403).json({ error: 'Cannot modify appointments for another patient' });
      return;
    }
    if (status !== 'cancelled') {
      res.status(403).json({ error: 'Patients can only cancel their appointment' });
      return;
    }
  }

  const updated = db.appointments.update(appointment.id, {
    status,
    notes: notes !== undefined ? notes : appointment.notes,
  });

  logAudit(
    'UPDATE_APPOINTMENT_STATUS',
    'appointment',
    appointment.id,
    `${req.user!.fullName} updated appointment status from ${appointment.status} to ${status}`,
    req
  );

  res.json({ message: 'Appointment status updated', appointment: updated });
});

export default router;
