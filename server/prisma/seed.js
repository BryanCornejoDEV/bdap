/* eslint-env node */
/* global process */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@bdap.local';
  const analystEmail = 'analyst@bdap.local';
  const adminPwd = await hashPassword('admin123');
  const analystPwd = await hashPassword('analyst123');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, password: adminPwd, role: 'admin' },
  });

  await prisma.user.upsert({
    where: { email: analystEmail },
    update: {},
    create: { email: analystEmail, password: analystPwd, role: 'analyst' },
  });

  // Crear organización ACME y asignar miembros
  const acme = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Acme Corp' },
  });

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const analyst = await prisma.user.findUnique({ where: { email: analystEmail } });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: admin.id, orgId: acme.id } },
    update: {},
    create: { userId: admin.id, orgId: acme.id, role: 'owner' },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: analyst.id, orgId: acme.id } },
    update: {},
    create: { userId: analyst.id, orgId: acme.id, role: 'member' },
  });

  const report = await prisma.report.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Ventas por mes', orgId: acme.id },
  });

  const rows = [
    { month: 'Ene', revenue: 12000, orders: 320 },
    { month: 'Feb', revenue: 15500, orders: 380 },
    { month: 'Mar', revenue: 14200, orders: 350 },
    { month: 'Abr', revenue: 21000, orders: 480 },
    { month: 'May', revenue: 18500, orders: 420 },
    { month: 'Jun', revenue: 22000, orders: 510 },
  ];
  for (const r of rows) {
    await prisma.metricRecord.upsert({
      where: { id: rows.indexOf(r) + 1 },
      update: {},
      create: { reportId: report.id, ...r },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed OK');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
