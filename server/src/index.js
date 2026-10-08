/* eslint-env node */
/* global process */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import prisma from './lib/prisma.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import integrationsRouter from './routes/integrations.js';
import usersRouter from './routes/users.js';
import organizationsRouter from './routes/organizations.js';

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS: en producción, restringir a los orígenes indicados en CORS_ORIGIN
// (lista separada por comas). En desarrollo se refleja cualquier origen.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (isProduction && corsOrigins.length === 0) {
  console.warn('CORS_ORIGIN no definida en producción — se aceptará cualquier origen');
}

app.set('trust proxy', true);
app.use(helmet());
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

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
  // No filtrar detalles internos en producción
  const message = status >= 500 && isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`BDAP API listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
