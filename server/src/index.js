/* eslint-env node */
/* global process */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import integrationsRouter from './routes/integrations.js';
import usersRouter from './routes/users.js';
import organizationsRouter from './routes/organizations.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', true);
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// routes
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/organizations', organizationsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`BDAP API listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
