/* eslint-env node */
/* global process */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Fallback: si DATABASE_URL no está definida (p. ej. en Render), usar SQLite local.
// Debe ocurrir ANTES de instanciar PrismaClient. No apto para producción real:
// en hosting efímero los datos se pierden en cada deploy. Preferir Postgres.
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL no definida — usando SQLite dev.db (no apto para producción)');
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

export default prisma;
