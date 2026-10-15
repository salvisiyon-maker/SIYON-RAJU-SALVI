import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken, requireRoles } from '../middleware/auth.ts';

const router = Router();

// GET /api/audit-logs - View audit history (Admin only)
router.get('/', authenticateToken, requireRoles('admin'), (req: Request, res: Response) => {
  const { action, entityType, limit = '50' } = req.query;

  let logs = db.auditLogs.find();

  if (action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes((action as string).toLowerCase()));
  }
  if (entityType) {
    logs = logs.filter((l) => l.entity_type === entityType);
  }

  const enriched = logs.slice(0, parseInt(limit as string, 10)).map((log) => {
    const user = log.user_id ? db.users.findById(log.user_id) : null;
    return {
      ...log,
      userName: user?.full_name || 'System / Anonymous',
      userRole: user?.role_id || 'system',
      userEmail: user?.email,
    };
  });

  res.json(enriched);
});

export default router;
