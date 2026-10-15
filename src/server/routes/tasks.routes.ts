import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles, logAudit } from '../middleware/auth.ts';
import { CreateTaskSchema, UpdateTaskStatusSchema } from '../validators/schemas.ts';

const router = Router();

// GET /api/tasks - List tasks
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status, priority, assignedTo } = req.query;
  const user = req.user!;

  let tasks = db.tasks.find();

  // If nurse, default to their assigned tasks
  if (user.role === 'nurse') {
    tasks = tasks.filter((t) => t.assigned_to_user_id === user.id);
  } else if (user.role === 'doctor') {
    // Doctors see tasks they assigned or all in their unit
    if (!req.query.all) {
      tasks = tasks.filter((t) => t.assigned_by_user_id === user.id);
    }
  }

  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter((t) => t.priority === priority);
  }
  if (assignedTo) {
    tasks = tasks.filter((t) => t.assigned_to_user_id === assignedTo);
  }

  // Enrich with assigner, assignee, and patient names
  const enriched = tasks.map((t) => {
    const assigner = db.users.findById(t.assigned_by_user_id);
    const assignee = db.users.findById(t.assigned_to_user_id);
    const patient = t.patient_id ? db.patients.findById(t.patient_id) : null;
    const patientUser = patient ? db.users.findById(patient.user_id) : null;

    return {
      ...t,
      assignedByName: assigner?.full_name || 'Staff',
      assignedToName: assignee?.full_name || 'Staff',
      patientName: patientUser?.full_name,
      patientCode: patient?.patient_id,
    };
  });

  // Sort by priority and due date
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  enriched.sort((a, b) => {
    const diff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  res.json(enriched);
});

// POST /api/tasks - Assign task (Doctor or Admin)
router.post('/', authenticateToken, requireRoles('doctor', 'admin'), (req: Request, res: Response) => {
  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const data = parseResult.data;
  const assignee = db.users.findById(data.assignedToUserId);
  if (!assignee) {
    res.status(404).json({ error: 'Assigned staff member not found' });
    return;
  }

  const taskId = `tsk-${Date.now()}`;
  const now = new Date().toISOString();

  const task = db.tasks.insert({
    id: taskId,
    assigned_by_user_id: req.user!.id,
    assigned_to_user_id: data.assignedToUserId,
    patient_id: data.patientId || null,
    title: data.title,
    description: data.description || '',
    priority: data.priority,
    due_time: data.dueTime || new Date(Date.now() + 3600000 * 4).toISOString(),
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  // Send in-app notification to assignee
  db.notifications.insert({
    id: `notif-${Date.now()}`,
    user_id: data.assignedToUserId,
    title: `New Task [${data.priority.toUpperCase()}]: ${data.title}`,
    message: `${req.user!.fullName} assigned you a task: "${data.title}"`,
    type: 'task',
    is_read: false,
    link: '/nurse/tasks',
    created_at: now,
  });

  logAudit(
    'ASSIGN_TASK',
    'task',
    taskId,
    `${req.user!.fullName} assigned task "${data.title}" to ${assignee.full_name}`,
    req
  );

  res.status(201).json({ message: 'Task assigned successfully', task });
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', authenticateToken, (req: Request, res: Response) => {
  const parseResult = UpdateTaskStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const task = db.tasks.findById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const { status } = parseResult.data;
  const updated = db.tasks.update(task.id, { status });

  // If completed, notify assigner
  if (status === 'completed' && task.assigned_by_user_id !== req.user!.id) {
    db.notifications.insert({
      id: `notif-${Date.now()}`,
      user_id: task.assigned_by_user_id,
      title: 'Task Completed',
      message: `${req.user!.fullName} completed task: "${task.title}"`,
      type: 'task',
      is_read: false,
      link: '/tasks',
      created_at: new Date().toISOString(),
    });
  }

  logAudit('UPDATE_TASK_STATUS', 'task', task.id, `${req.user!.fullName} changed task status to ${status}`, req);

  res.json({ message: 'Task updated', task: updated });
});

export default router;
