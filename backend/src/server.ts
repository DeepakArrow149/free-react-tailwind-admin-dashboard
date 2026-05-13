/**
 * Express Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';

// Route modules
import authRoutes from './modules/auth/authRoutes.js';
import companyRoutes from './modules/company/companyRoutes.js';
import branchRoutes from './modules/branches/branchRoutes.js';
import userRoutes from './modules/users/userRoutes.js';

const app = express();

// ─── Global Middleware ───────────────────────────────────────
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/branch', branchRoutes);
app.use('/api/users', userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ─── Global Error Handler ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`
  ┌──────────────────────────────────────────────┐
  │  🚀 SaaS Backend Server                     │
  │  Port: ${config.port}                              │
  │  Env:  ${config.nodeEnv}                     │
  │  API:  http://localhost:${config.port}/api          │
  └──────────────────────────────────────────────┘
  `);
});

export default app;
