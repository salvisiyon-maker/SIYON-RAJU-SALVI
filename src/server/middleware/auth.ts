import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.ts';
import { db } from '../db/index.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  patientId?: string; // e.g. 'pat-ananya'
  patientCode?: string; // e.g. 'VL-2026-004812'
  doctorId?: string; // e.g. 'doc-priya'
  nurseId?: string; // e.g. 'nurse-sunita'
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateAccessToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, CONFIG.JWT_REFRESH_SECRET, { expiresIn: CONFIG.REFRESH_TOKEN_EXPIRY });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as AuthenticatedUser;
    const user = db.users.findById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists or has been deactivated' });
      return;
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      res.status(403).json({ error: 'Account temporarily locked. Please try again later.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export function requireRoles(...roles: Array<'admin' | 'doctor' | 'nurse' | 'patient'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Requires one of roles: [${roles.join(', ')}]` });
      return;
    }

    next();
  };
}

export function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  req: Request
) {
  try {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.auditLogs.insert({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: req.user ? req.user.id : null,
      action,
      entity_type: entityType,
      entityId,
      details,
      ip_address: ip,
      created_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
