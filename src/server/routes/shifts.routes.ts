import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { CreateShiftSchema } from '../validators/schemas.ts';

const router = Router();

// GET /api/shifts - List shifts
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { date, role, userId } = req.query;
  let shifts = db.shifts.find();

  if (date) {
    shifts = shifts.filter((s) => s.shift_date === date);
  }
  if (role) {
    shifts = shifts.filter((s) => s.role === role);
  }
  if (userId) {
    shifts = shifts.filter((s) => s.user_id === userId);
  }

  const enriched = shifts.map((s) => {
    const user = db.users.findById(s.user_id);
    const department = s.department_id ? db.departments.findById(s.department_id) : null;
    return {
      ...s,
      staffName: user?.full_name || 'Staff Member',
      staffEmail: user?.email,
      departmentName: department?.name || 'General',
    };
  });

  enriched.sort((a, b) => `${a.shift_date} ${a.start_time}`.localeCompare(`${b.shift_date} ${b.start_time}`));
  res.json(enriched);
});

// POST /api/shifts - Schedule shift (Admin)
router.post('/', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const parseResult = CreateShiftSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;
  const user = db.users.findById(data.userId);
  if (!user) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }

  const shiftId = `shf-${Date.now()}`;
  const newShift = db.shifts.insert({
    id: shiftId,
    user_id: data.userId,
    role: data.role,
    department_id: data.departmentId || null,
    shift_date: data.shiftDate,
    start_time: data.startTime,
    end_time: data.endTime,
    status: 'scheduled',
    notes: data.notes || '',
    created_at: new Date().toISOString(),
  });

  // Notify staff member
  db.notifications.insert({
    id: `notif-${Date.now()}`,
    user_id: data.userId,
    title: 'New Shift Scheduled',
    message: `You have been scheduled for a ${data.role} shift on ${data.shiftDate} from ${data.startTime} to ${data.endTime}.`,
    type: 'system',
    is_read: false,
    link: '/shifts',
    created_at: new Date().toISOString(),
  });

  logAudit('SCHEDULE_SHIFT', 'shift', shiftId, `Admin scheduled shift for ${user.full_name}`, req);

  res.status(201).json({ message: 'Shift scheduled successfully', shift: newShift });
});

// DELETE /api/shifts/:id
router.delete('/:id', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const shift = db.shifts.findById(req.params.id);
  if (!shift) {
    res.status(404).json({ error: 'Shift not found' });
    return;
  }

  db.shifts.delete(shift.id);
  logAudit('DELETE_SHIFT', 'shift', shift.id, `Admin deleted shift ${shift.id}`, req);

  res.json({ message: 'Shift deleted successfully' });
});

export default router;
