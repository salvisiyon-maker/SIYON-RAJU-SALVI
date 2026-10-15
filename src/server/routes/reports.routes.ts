import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles } from '../middleware/auth.ts';

const router = Router();

// GET /api/reports/analytics - Admin summary stats and charts data
router.get('/analytics', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const allPatients = db.patients.find();
  const allAppointments = db.appointments.find();
  const allVisits = db.visits.find();
  const allPrescriptions = db.prescriptions.find();
  const allDoctors = db.doctors.find();
  const allNurses = db.nurses.find();
  const allDepartments = db.departments.find();

  // 1. Patients per day (last 7 days)
  const last7Days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7Days[d] = 0;
  }
  allPatients.forEach((p) => {
    const d = p.created_at.slice(0, 10);
    if (last7Days[d] !== undefined) {
      last7Days[d]++;
    }
  });

  const patientsPerDay = Object.entries(last7Days).map(([date, count]) => ({
    date,
    count,
  }));

  // 2. Appointments by department
  const deptMap: Record<string, number> = {};
  allDepartments.forEach((dept) => {
    deptMap[dept.name] = 0;
  });
  allAppointments.forEach((apt) => {
    const dept = db.departments.findById(apt.department_id);
    const name = dept?.name || 'Other';
    deptMap[name] = (deptMap[name] || 0) + 1;
  });

  const appointmentsByDept = Object.entries(deptMap).map(([department, count]) => ({
    department,
    count,
  }));

  // 3. Doctor workload (appointments and visits handled)
  const doctorWorkload = allDoctors.map((doc) => {
    const user = db.users.findById(doc.user_id);
    const docApts = allAppointments.filter((a) => a.doctor_id === doc.id);
    const docVisits = allVisits.filter((v) => v.doctor_id === doc.id);
    const dept = db.departments.findById(doc.department_id);

    return {
      doctorId: doc.id,
      doctorName: user?.full_name || 'Dr. Doctor',
      department: dept?.name || 'General',
      totalAppointments: docApts.length,
      completedVisits: docVisits.length,
      activeAppointments: docApts.filter((a) => a.status === 'scheduled' || a.status === 'in_consultation').length,
    };
  });

  // 4. Appointment Status Breakdown
  const statusCounts = {
    scheduled: allAppointments.filter((a) => a.status === 'scheduled').length,
    checked_in: allAppointments.filter((a) => a.status === 'checked_in').length,
    in_consultation: allAppointments.filter((a) => a.status === 'in_consultation').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
    cancelled: allAppointments.filter((a) => a.status === 'cancelled').length,
  };

  res.json({
    summary: {
      totalPatients: allPatients.length,
      totalDoctors: allDoctors.length,
      totalNurses: allNurses.length,
      totalAppointments: allAppointments.length,
      totalVisits: allVisits.length,
      totalPrescriptions: allPrescriptions.length,
    },
    patientsPerDay,
    appointmentsByDept,
    doctorWorkload,
    statusCounts,
  });
});

// GET /api/reports/export-csv - Export records in CSV format
router.get('/export-csv', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'patients';

  let csvRows: string[] = [];

  if (type === 'patients') {
    csvRows.push('Patient ID,Full Name,Email,Phone,DOB,Blood Group,Allergies,Registered At');
    db.patients.find().forEach((p) => {
      const u = db.users.findById(p.user_id);
      csvRows.push(
        `"${p.patient_id}","${u?.full_name || ''}","${u?.email || ''}","${u?.phone || ''}","${u?.dob || ''}","${p.blood_group || ''}","${(p.allergies || '').replace(/"/g, '""')}","${p.created_at}"`
      );
    });
  } else if (type === 'appointments') {
    csvRows.push('Appointment ID,Date,Time,Status,Doctor,Patient,Reason');
    db.appointments.find().forEach((a) => {
      const p = db.patients.findById(a.patient_id);
      const pu = p ? db.users.findById(p.user_id) : null;
      const d = db.doctors.findById(a.doctor_id);
      const du = d ? db.users.findById(d.user_id) : null;
      csvRows.push(
        `"${a.id}","${a.date}","${a.start_time} - ${a.end_time}","${a.status}","${du?.full_name || ''}","${pu?.full_name || ''}","${(a.reason || '').replace(/"/g, '""')}"`
      );
    });
  } else if (type === 'visits') {
    csvRows.push('Visit ID,Date,Patient,Doctor,Diagnosis,Vitals BP,Pulse,Temp');
    db.visits.find().forEach((v) => {
      const p = db.patients.findById(v.patient_id);
      const pu = p ? db.users.findById(p.user_id) : null;
      const d = db.doctors.findById(v.doctor_id);
      const du = d ? db.users.findById(d.user_id) : null;
      csvRows.push(
        `"${v.id}","${v.visit_date}","${pu?.full_name || ''}","${du?.full_name || ''}","${(v.diagnosis || '').replace(/"/g, '""')}","${v.vitals_bp || ''}","${v.vitals_pulse || ''}","${v.vitals_temp || ''}"`
      );
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="vitallink_${type}_report.csv"`);
  res.send(csvRows.join('\n'));
});

export default router;
