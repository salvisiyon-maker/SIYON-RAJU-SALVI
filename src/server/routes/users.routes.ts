import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { UpdateProfileSchema } from '../validators/schemas.ts';

const router = Router();

// GET /api/users/profile - Get current user profile with role-specific details
router.get('/profile', authenticateToken, (req: Request, res: Response) => {
  const user = db.users.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const patient = db.patients.findByUserId(user.id);
  const doctor = db.doctors.findByUserId(user.id);
  const nurse = db.nurses.findByUserId(user.id);
  const department = doctor ? db.departments.findById(doctor.department_id) : nurse ? db.departments.findById(nurse.department_id) : null;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role_id,
      fullName: user.full_name,
      phone: user.phone,
      address: user.address,
      dob: user.dob,
      avatarUrl: user.avatar_url,
    },
    patient,
    doctor,
    nurse,
    department,
  });
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authenticateToken, (req: Request, res: Response) => {
  const parseResult = UpdateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;
  const user = db.users.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Update base user
  db.users.update(user.id, {
    full_name: data.fullName ?? user.full_name,
    phone: data.phone ?? user.phone,
    address: data.address ?? user.address,
    dob: data.dob ?? user.dob,
    avatar_url: data.avatarUrl ?? user.avatar_url,
  });

  // Update role-specific fields
  if (user.role_id === 'patient') {
    const patient = db.patients.findByUserId(user.id);
    if (patient) {
      db.patients.update(patient.id, {
        blood_group: data.bloodGroup ?? patient.blood_group,
        allergies: data.allergies ?? patient.allergies,
        emergency_contact: data.emergencyContact ?? patient.emergency_contact,
        emergency_phone: data.emergencyPhone ?? patient.emergency_phone,
      });
    }
  } else if (user.role_id === 'doctor') {
    const doctor = db.doctors.findByUserId(user.id);
    if (doctor) {
      db.doctors.update(doctor.id, {
        specialization: data.specialization ?? doctor.specialization,
        license_no: data.licenseNo ?? doctor.license_no,
      });
    }
  } else if (user.role_id === 'nurse') {
    const nurse = db.nurses.findByUserId(user.id);
    if (nurse) {
      db.nurses.update(nurse.id, {
        ward: data.ward ?? nurse.ward,
        shift_preference: data.shiftPreference ?? nurse.shift_preference,
      });
    }
  }

  logAudit('UPDATE_PROFILE', 'user', user.id, `${user.full_name} updated their profile`, req);

  res.json({ message: 'Profile updated successfully' });
});

// GET /api/users/staff - Admin views all staff members (doctors & nurses)
router.get('/staff', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const staffUsers = db.users.find((u) => u.role_id === 'doctor' || u.role_id === 'nurse');

  const result = staffUsers.map((u) => {
    const doctor = db.doctors.findByUserId(u.id);
    const nurse = db.nurses.findByUserId(u.id);
    const deptId = doctor?.department_id || nurse?.department_id;
    const dept = deptId ? db.departments.findById(deptId) : null;

    return {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role_id,
      avatarUrl: u.avatar_url,
      department: dept?.name || 'Unassigned',
      details: doctor ? { specialization: doctor.specialization, licenseNo: doctor.license_no } : nurse ? { ward: nurse.ward, shift: nurse.shift_preference } : null,
    };
  });

  res.json(result);
});

// GET /api/users/doctors - Public or authenticated list of available doctors with departments
router.get('/doctors', authenticateToken, (req: Request, res: Response) => {
  const doctors = db.doctors.find();
  const list = doctors.map((doc) => {
    const user = db.users.findById(doc.user_id);
    const dept = db.departments.findById(doc.department_id);
    return {
      id: doc.id,
      userId: doc.user_id,
      name: user?.full_name || 'Dr. Unknown',
      email: user?.email,
      avatarUrl: user?.avatar_url,
      specialization: doc.specialization,
      departmentId: doc.department_id,
      departmentName: dept?.name || 'General',
      consultationFee: doc.consultation_fee,
      isAvailable: doc.is_available,
    };
  });
  res.json(list);
});

// GET /api/users/nurses - List nurses for task assignment
router.get('/nurses', authenticateToken, requireRoles('admin', 'doctor'), (req: Request, res: Response) => {
  const nurses = db.nurses.find();
  const list = nurses.map((n) => {
    const user = db.users.findById(n.user_id);
    const dept = db.departments.findById(n.department_id);
    return {
      id: n.id,
      userId: n.user_id,
      name: user?.full_name || 'Nurse Unknown',
      email: user?.email,
      ward: n.ward,
      departmentName: dept?.name || 'General',
    };
  });
  res.json(list);
});

// GET /api/users/departments
router.get('/departments', (req: Request, res: Response) => {
  res.json(db.departments.find((d) => d.active));
});

export default router;
