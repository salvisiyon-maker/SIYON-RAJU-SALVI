import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// GET /api/notifications - User's notifications
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const notifs = db.notifications.find((n) => n.user_id === req.user!.id);
  const unreadCount = notifs.filter((n) => !n.is_read).length;
  res.json({ notifications: notifs, unreadCount });
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticateToken, (req: Request, res: Response) => {
  const updated = db.notifications.markAsRead(req.params.id);
  res.json({ message: 'Marked as read', notification: updated });
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', authenticateToken, (req: Request, res: Response) => {
  db.notifications.markAllAsRead(req.user!.id);
  res.json({ message: 'All notifications marked as read' });
});

export default router;
