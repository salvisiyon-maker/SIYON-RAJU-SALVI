import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './src/server/routes/auth.routes.ts';
import usersRoutes from './src/server/routes/users.routes.ts';
import patientsRoutes from './src/server/routes/patients.routes.ts';
import appointmentsRoutes from './src/server/routes/appointments.routes.ts';
import visitsRoutes from './src/server/routes/visits.routes.ts';
import prescriptionsRoutes from './src/server/routes/prescriptions.routes.ts';
import shiftsRoutes from './src/server/routes/shifts.routes.ts';
import tasksRoutes from './src/server/routes/tasks.routes.ts';
import notificationsRoutes from './src/server/routes/notifications.routes.ts';
import reportsRoutes from './src/server/routes/reports.routes.ts';
import auditRoutes from './src/server/routes/audit.routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'VitalLink Healthcare API', timestamp: new Date().toISOString() });
  });

  // REST API Route Groups
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/patients', patientsRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/visits', visitsRoutes);
  app.use('/api/prescriptions', prescriptionsRoutes);
  app.use('/api/shifts', shiftsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/audit-logs', auditRoutes);

  // Centralized Error Handler for API
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  if (!isProd) {
    // Mount Vite middlewares in development
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VitalLink Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VitalLink server:', err);
  process.exit(1);
});
