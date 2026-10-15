import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { CONFIG } from '../config.ts';
import { LoginSchema, ChangePasswordSchema, SelfRegisterSchema } from '../validators/schemas.ts';
import { authenticateToken, generateAccessToken, generateRefreshToken, logAudit } from '../middleware/auth.ts';
import { generatePatientId } from '../../utils/pure_logic.ts';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const { identifier, password, role } = parseResult.data;
  let user: any = null;
  let patientRecord: any = null;
  let doctorRecord: any = null;
  let nurseRecord: any = null;

  const trimmedId = identifier.trim();

  // 1. If identifier starts with 'VL-' or matches patient code format, check patient table
  if (trimmedId.toUpperCase().startsWith('VL-')) {
    patientRecord = db.patients.findByPatientId(trimmedId);
    if (patientRecord) {
      user = db.users.findById(patientRecord.user_id);
    }
  }

  // 2. If not found, lookup by user email
  if (!user) {
    user = db.users.findByEmail(trimmedId);
    if (user && user.role_id === 'patient') {
      patientRecord = db.patients.findByUserId(user.id);
    }
  }

  // 3. Fallback: check if identifier matches any patient ID case-insensitively
  if (!user) {
    patientRecord = db.patients.findByPatientId(trimmedId);
    if (patientRecord) {
      user = db.users.findById(patientRecord.user_id);
    }
  }

  if (!user) {
    res.status(401).json({
      error: `No account found for "${trimmedId}". Please verify your email or Patient ID, or create a new account via the 'Create New Account' tab.`,
    });
    return;
  }

  // Check account lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    res.status(403).json({
      error: `Account locked due to multiple failed login attempts. Please wait ${minutesLeft} minute(s).`,
    });
    return;
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);

  if (!passwordMatch) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil = null;
    let errorMsg = 'Invalid credentials';

    if (attempts >= CONFIG.MAX_FAILED_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + CONFIG.LOCKOUT_DURATION_MINUTES * 60000).toISOString();
      errorMsg = `Account locked for ${CONFIG.LOCKOUT_DURATION_MINUTES} minutes due to ${attempts} failed attempts.`;
    }

    db.users.update(user.id, {
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
    });

    res.status(401).json({ error: errorMsg, attemptsRemaining: Math.max(0, CONFIG.MAX_FAILED_LOGIN_ATTEMPTS - attempts) });
    return;
  }

  // Reset failed login attempts on success
  db.users.update(user.id, {
    failed_login_attempts: 0,
    locked_until: null,
  });

  const actualRole = user.role_id;
  if (actualRole === 'doctor') {
    doctorRecord = db.doctors.findByUserId(user.id);
  } else if (actualRole === 'nurse') {
    nurseRecord = db.nurses.findByUserId(user.id);
  } else if (actualRole === 'patient' && !patientRecord) {
    patientRecord = db.patients.findByUserId(user.id);
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role_id,
    fullName: user.full_name,
    patientId: patientRecord?.id,
    patientCode: patientRecord?.patient_id,
    doctorId: doctorRecord?.id,
    nurseId: nurseRecord?.id,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id });

  logAudit('USER_LOGIN', 'user', user.id, `${user.full_name} logged in as ${user.role_id}`, req);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      role: user.role_id,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      mustChangePassword: !!user.must_change_password,
      patientId: patientRecord?.id,
      patientCode: patientRecord?.patient_id,
      doctorId: doctorRecord?.id,
      nurseId: nurseRecord?.id,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, CONFIG.JWT_REFRESH_SECRET) as { id: string };
    const user = db.users.findById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User does not exist' });
      return;
    }

    const patientRecord = db.patients.findByUserId(user.id);
    const doctorRecord = db.doctors.findByUserId(user.id);
    const nurseRecord = db.nurses.findByUserId(user.id);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role_id as any,
      fullName: user.full_name,
      patientId: patientRecord?.id,
      patientCode: patientRecord?.patient_id,
      doctorId: doctorRecord?.id,
      nurseId: nurseRecord?.id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, (req: Request, res: Response) => {
  const parseResult = ChangePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const { currentPassword, newPassword } = parseResult.data;
  const user = db.users.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const matches = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!matches) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.users.update(user.id, {
    password_hash: newHash,
    must_change_password: false,
  });

  logAudit('CHANGE_PASSWORD', 'user', user.id, 'User successfully updated password', req);

  res.json({ message: 'Password changed successfully' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = db.users.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const patient = db.patients.findByUserId(user.id);
  const doctor = db.doctors.findByUserId(user.id);
  const nurse = db.nurses.findByUserId(user.id);
  const unreadCount = db.notifications.find((n) => n.user_id === user.id && !n.is_read).length;

  res.json({
    id: user.id,
    email: user.email,
    role: user.role_id,
    fullName: user.full_name,
    phone: user.phone,
    address: user.address,
    dob: user.dob,
    avatarUrl: user.avatar_url,
    mustChangePassword: !!user.must_change_password,
    unreadNotifications: unreadCount,
    patient,
    doctor,
    nurse,
  });
});

// POST /api/auth/register - Open account registration
router.post('/register', async (req: Request, res: Response) => {
  const parseResult = SelfRegisterSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;

  // Check existing user
  const existingUser = db.users.findByEmail(data.email);
  if (existingUser) {
    res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = `usr-${Date.now()}`;
  const passwordHash = bcrypt.hashSync(data.password, 10);

  // Create User
  const newUser = db.users.insert({
    id: userId,
    email: data.email.toLowerCase().trim(),
    password_hash: passwordHash,
    role_id: data.role,
    full_name: data.fullName.trim(),
    phone: data.phone || '',
    address: data.address || '',
    dob: data.dob || '',
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
    must_change_password: false,
    failed_login_attempts: 0,
    created_at: now,
    updated_at: now,
  });

  let patientRecord: any = null;
  let doctorRecord: any = null;
  let nurseRecord: any = null;

  if (data.role === 'patient') {
    let generatedCode = generatePatientId(2026);
    while (db.patients.findByPatientId(generatedCode)) {
      generatedCode = generatePatientId(2026);
    }

    patientRecord = db.patients.insert({
      id: `pat-${Date.now()}`,
      user_id: userId,
      patient_id: generatedCode,
      bloodGroup: data.bloodGroup || 'B+',
      allergies: data.allergies || 'None reported',
      emergencyContact: data.emergencyContact || 'Family / Emergency Contact',
      emergencyPhone: data.emergencyPhone || data.phone || '',
      registered_by_user_id: userId,
      created_at: now,
      updated_at: now,
    } as any);

    // Welcome notification
    db.notifications.insert({
      id: `notif-${Date.now()}`,
      user_id: userId,
      title: 'Welcome to VitalLink Healthcare',
      message: `Your account is ready! Your unique Patient ID is ${generatedCode}. You can now view visits, prescriptions, and book appointments.`,
      type: 'system',
      is_read: false,
      link: '/patient',
      created_at: now,
    });
  } else if (data.role === 'doctor') {
    const deptId = data.departmentId || db.departments.find()[0]?.id || 'dept-genmed';
    doctorRecord = db.doctors.insert({
      id: `doc-${Date.now()}`,
      user_id: userId,
      department_id: deptId,
      specialization: data.specialization || 'General Physician',
      license_no: data.licenseNo || `MCI-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      consultation_fee: 800,
      availability_schedule: JSON.stringify({
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        slots: ['09:00-13:00', '14:00-17:00'],
      }),
      is_available: true,
      created_at: now,
      updated_at: now,
    });
  } else if (data.role === 'nurse') {
    const deptId = data.departmentId || db.departments.find()[0]?.id || 'dept-genmed';
    nurseRecord = db.nurses.insert({
      id: `nurse-${Date.now()}`,
      user_id: userId,
      department_id: deptId,
      ward: data.ward || 'General Outpatient Ward',
      shift_preference: data.shiftPreference || 'Day',
      created_at: now,
      updated_at: now,
    });
  }

  const tokenPayload = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role_id as any,
    fullName: newUser.full_name,
    patientId: patientRecord?.id,
    patientCode: patientRecord?.patient_id,
    doctorId: doctorRecord?.id,
    nurseId: nurseRecord?.id,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: newUser.id });

  logAudit('USER_REGISTER', 'user', newUser.id, `New user ${newUser.full_name} registered as ${newUser.role_id}`, req);

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role_id,
      fullName: newUser.full_name,
      avatarUrl: newUser.avatar_url,
      mustChangePassword: false,
      patientId: patientRecord?.id,
      patientCode: patientRecord?.patient_id,
      doctorId: doctorRecord?.id,
      nurseId: nurseRecord?.id,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/auth/guest-login - Quick guest exploration
router.post('/guest-login', (req: Request, res: Response) => {
  const role = req.body.role || 'patient';
  let targetUser: any = null;

  if (role === 'admin') {
    targetUser = db.users.findByEmail('admin@vitallink.com');
  } else if (role === 'doctor') {
    targetUser = db.users.findByEmail('dr.priya@vitallink.com');
  } else if (role === 'nurse') {
    targetUser = db.users.findByEmail('nurse.sunita@vitallink.com');
  } else {
    targetUser = db.users.findByEmail('ananya.gupta@example.com');
  }

  if (!targetUser) {
    res.status(404).json({ error: 'Guest demo profile not found' });
    return;
  }

  const patientRecord = db.patients.findByUserId(targetUser.id);
  const doctorRecord = db.doctors.findByUserId(targetUser.id);
  const nurseRecord = db.nurses.findByUserId(targetUser.id);

  const tokenPayload = {
    id: targetUser.id,
    email: targetUser.email,
    role: targetUser.role_id as any,
    fullName: targetUser.full_name,
    patientId: patientRecord?.id,
    patientCode: patientRecord?.patient_id,
    doctorId: doctorRecord?.id,
    nurseId: nurseRecord?.id,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: targetUser.id });

  logAudit('GUEST_EXPLORE', 'user', targetUser.id, `Guest explored system as ${role}`, req);

  res.json({
    message: 'Guest login successful',
    user: {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role_id,
      fullName: targetUser.full_name,
      avatarUrl: targetUser.avatar_url,
      mustChangePassword: false,
      patientId: patientRecord?.id,
      patientCode: patientRecord?.patient_id,
      doctorId: doctorRecord?.id,
      nurseId: nurseRecord?.id,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

export default router;

