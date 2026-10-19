/* eslint-env node */
/* global process */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@bdap.local';
  const analystEmail = 'analyst@bdap.local';
  const opsEmail = 'ops@bdap.local';

  const adminPwd = await hashPassword('admin123');
  const analystPwd = await hashPassword('analyst123');
  const opsPwd = await hashPassword('ops12345');

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Carlos Mendoza' },
    create: { email: adminEmail, name: 'Carlos Mendoza', password: adminPwd, role: 'admin' },
  });

  const analyst = await prisma.user.upsert({
    where: { email: analystEmail },
    update: { name: 'Sofía Vargas' },
    create: { email: analystEmail, name: 'Sofía Vargas', password: analystPwd, role: 'analyst' },
  });

  const ops = await prisma.user.upsert({
    where: { email: opsEmail },
    update: { name: 'Mateo Rojas' },
    create: { email: opsEmail, name: 'Mateo Rojas', password: opsPwd, role: 'analyst' },
  });

  // 1. Organizaciones Multi-Tenant
  const acme = await prisma.organization.upsert({
    where: { id: 1 },
    update: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      industry: 'E-Commerce & Retail Global',
      plan: 'enterprise',
      currency: 'USD',
    },
    create: {
      id: 1,
      name: 'Acme Corp',
      slug: 'acme-corp',
      industry: 'E-Commerce & Retail Global',
      plan: 'enterprise',
      currency: 'USD',
    },
  });

  const globex = await prisma.organization.upsert({
    where: { id: 2 },
    update: {
      name: 'Globex Latam',
      slug: 'globex-latam',
      industry: 'Fintech & Pagos Digitales',
      plan: 'enterprise',
      currency: 'USD',
    },
    create: {
      id: 2,
      name: 'Globex Latam',
      slug: 'globex-latam',
      industry: 'Fintech & Pagos Digitales',
      plan: 'enterprise',
      currency: 'USD',
    },
  });

  const initech = await prisma.organization.upsert({
    where: { id: 3 },
    update: {
      name: 'Initech Cloud',
      slug: 'initech-cloud',
      industry: 'SaaS & Inteligencia Artificial',
      plan: 'business',
      currency: 'USD',
    },
    create: {
      id: 3,
      name: 'Initech Cloud',
      slug: 'initech-cloud',
      industry: 'SaaS & Inteligencia Artificial',
      plan: 'business',
      currency: 'USD',
    },
  });

  // 2. Membresías Multi-Empresa
  const memberships = [
    { userId: admin.id, orgId: acme.id, role: 'owner', department: 'Dirección Ejecutiva' },
    { userId: analyst.id, orgId: acme.id, role: 'admin', department: 'Business Intelligence' },
    { userId: ops.id, orgId: acme.id, role: 'member', department: 'Operaciones & Logística' },
    { userId: admin.id, orgId: globex.id, role: 'owner', department: 'Junta Directiva' },
    { userId: analyst.id, orgId: globex.id, role: 'member', department: 'Riesgo & Datos' },
    { userId: admin.id, orgId: initech.id, role: 'owner', department: 'C-Level' },
    { userId: ops.id, orgId: initech.id, role: 'admin', department: 'Ingeniería Cloud' },
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: m.userId, orgId: m.orgId } },
      update: { role: m.role, department: m.department },
      create: m,
    });
  }

  // 3. Reportes y Series de Datos por Empresa
  const report1 = await prisma.report.upsert({
    where: { id: 1 },
    update: {
      name: 'Ventas y Rentabilidad Anual',
      description: 'Consolidado comercial de ingresos, costos operativos y clientes activos.',
      category: 'Finanzas',
    },
    create: {
      id: 1,
      name: 'Ventas y Rentabilidad Anual',
      description: 'Consolidado comercial de ingresos, costos operativos y clientes activos.',
      category: 'Finanzas',
      orgId: acme.id,
    },
  });

  const report2 = await prisma.report.upsert({
    where: { id: 2 },
    update: {
      name: 'Expansión Canal Enterprise B2B',
      description: 'Seguimiento de contratos corporativos y cuentas clave.',
      category: 'Comercial',
    },
    create: {
      id: 2,
      name: 'Expansión Canal Enterprise B2B',
      description: 'Seguimiento de contratos corporativos y cuentas clave.',
      category: 'Comercial',
      orgId: acme.id,
    },
  });

  const report3 = await prisma.report.upsert({
    where: { id: 3 },
    update: {
      name: 'Volumen Transaccional Fintech',
      description: 'Procesamiento de pasarela, comisiones netas y comercios afiliados.',
      category: 'Operaciones',
    },
    create: {
      id: 3,
      name: 'Volumen Transaccional Fintech',
      description: 'Procesamiento de pasarela, comisiones netas y comercios afiliados.',
      category: 'Operaciones',
      orgId: globex.id,
    },
  });

  const report4 = await prisma.report.upsert({
    where: { id: 4 },
    update: {
      name: 'Suscripciones Cloud & ARR',
      description: 'Crecimiento recurrente de licencias SaaS y consumo de infraestructura.',
      category: 'SaaS Metrics',
    },
    create: {
      id: 4,
      name: 'Suscripciones Cloud & ARR',
      description: 'Crecimiento recurrente de licencias SaaS y consumo de infraestructura.',
      category: 'SaaS Metrics',
      orgId: initech.id,
    },
  });

  // Limpiar y poblar filas si hay pocas para asegurar datos ricos con gastos y clientes
  await prisma.metricRecord.deleteMany({
    where: { reportId: { in: [report1.id, report2.id, report3.id, report4.id] } },
  });

  await prisma.metricRecord.createMany({
    data: [
      // Acme Report 1
      { reportId: report1.id, month: 'Ene', revenue: 34000, orders: 420, expenses: 19500, customers: 310 },
      { reportId: report1.id, month: 'Feb', revenue: 38500, orders: 465, expenses: 21000, customers: 345 },
      { reportId: report1.id, month: 'Mar', revenue: 36200, orders: 440, expenses: 20400, customers: 332 },
      { reportId: report1.id, month: 'Abr', revenue: 45800, orders: 540, expenses: 23800, customers: 410 },
      { reportId: report1.id, month: 'May', revenue: 49200, orders: 590, expenses: 24900, customers: 452 },
      { reportId: report1.id, month: 'Jun', revenue: 56400, orders: 660, expenses: 27100, customers: 518 },
      { reportId: report1.id, month: 'Jul', revenue: 61800, orders: 715, expenses: 28900, customers: 560 },
      { reportId: report1.id, month: 'Ago', revenue: 68500, orders: 790, expenses: 31200, customers: 625 },
      // Acme Report 2
      { reportId: report2.id, month: 'Q1', revenue: 82000, orders: 48, expenses: 44000, customers: 24 },
      { reportId: report2.id, month: 'Q2', revenue: 96500, orders: 56, expenses: 49000, customers: 31 },
      { reportId: report2.id, month: 'Q3', revenue: 118000, orders: 69, expenses: 55200, customers: 39 },
      // Globex Report 3
      { reportId: report3.id, month: 'May', revenue: 92000, orders: 4100, expenses: 48000, customers: 890 },
      { reportId: report3.id, month: 'Jun', revenue: 108500, orders: 4750, expenses: 52400, customers: 1020 },
      { reportId: report3.id, month: 'Jul', revenue: 124000, orders: 5380, expenses: 57100, customers: 1185 },
      { reportId: report3.id, month: 'Ago', revenue: 141200, orders: 6120, expenses: 61800, customers: 1340 },
      // Initech Report 4
      { reportId: report4.id, month: 'May', revenue: 28000, orders: 140, expenses: 16200, customers: 115 },
      { reportId: report4.id, month: 'Jun', revenue: 33400, orders: 168, expenses: 17500, customers: 138 },
      { reportId: report4.id, month: 'Jul', revenue: 39800, orders: 199, expenses: 19100, customers: 164 },
      { reportId: report4.id, month: 'Ago', revenue: 46500, orders: 232, expenses: 21000, customers: 192 },
    ],
  });

  // 4. Metas y OKRs Corporativos
  const existingGoals = await prisma.goal.count();
  if (existingGoals === 0) {
    await prisma.goal.createMany({
      data: [
        {
          orgId: acme.id,
          title: 'Superar $420,000 en Ingresos Acumulados Anuales',
          category: 'Ventas',
          targetValue: 420000,
          currentValue: 390400,
          unit: 'USD',
          deadline: '2026-12-31',
          ownerName: 'Carlos Mendoza',
          priority: 'critical',
          status: 'on_track',
          linkedReportId: report1.id,
        },
        {
          orgId: acme.id,
          title: 'Alcanzar 5,000 Órdenes Procesadas en E-Commerce',
          category: 'Operaciones',
          targetValue: 5000,
          currentValue: 4620,
          unit: 'órdenes',
          deadline: '2026-11-30',
          ownerName: 'Mateo Rojas',
          priority: 'high',
          status: 'on_track',
          linkedReportId: report1.id,
        },
        {
          orgId: acme.id,
          title: 'Reducir Costo de Adquisición (CAC) en Canal Digital',
          category: 'Marketing',
          targetValue: 100,
          currentValue: 68,
          unit: '%',
          deadline: '2026-11-15',
          ownerName: 'Sofía Vargas',
          priority: 'medium',
          status: 'at_risk',
          linkedReportId: null,
        },
        {
          orgId: acme.id,
          title: 'Certificar Seguridad Multi-Tenant ISO 27001',
          category: 'Tecnología',
          targetValue: 100,
          currentValue: 100,
          unit: '%',
          deadline: '2026-10-15',
          ownerName: 'Carlos Mendoza',
          priority: 'high',
          status: 'completed',
          linkedReportId: null,
        },
        // Globex OKRs
        {
          orgId: globex.id,
          title: 'Escalar Volumen Procesado a $500,000 USD',
          category: 'Finanzas',
          targetValue: 500000,
          currentValue: 465700,
          unit: 'USD',
          deadline: '2026-12-31',
          ownerName: 'Carlos Mendoza',
          priority: 'critical',
          status: 'on_track',
          linkedReportId: report3.id,
        },
        // Initech OKRs
        {
          orgId: initech.id,
          title: 'Llegar a $180,000 ARR en Licencias Cloud IA',
          category: 'Ventas',
          targetValue: 180000,
          currentValue: 147700,
          unit: 'USD',
          deadline: '2026-12-31',
          ownerName: 'Mateo Rojas',
          priority: 'critical',
          status: 'on_track',
          linkedReportId: report4.id,
        },
      ],
    });
  }

  // 5. Tablero Operativo de Tareas (WorkspaceTask)
  const existingTasks = await prisma.workspaceTask.count();
  if (existingTasks === 0) {
    await prisma.workspaceTask.createMany({
      data: [
        {
          orgId: acme.id,
          title: 'Auditoría de márgenes Q3 y ajuste de precios mayoristas',
          description: 'Cruzar datos de Stripe con costos logísticos para optimizar el margen neto en +3.5%.',
          status: 'in_progress',
          priority: 'urgent',
          department: 'Finanzas',
          assignee: 'Sofía Vargas',
          dueDate: '2026-10-28',
          estimatedHours: 8,
        },
        {
          orgId: acme.id,
          title: 'Automatizar sincronización nocturna con HubSpot CRM',
          description: 'Configurar pipeline de prospectos calificados hacia el reporte de expansión B2B.',
          status: 'review',
          priority: 'high',
          department: 'Analítica',
          assignee: 'Carlos Mendoza',
          dueDate: '2026-10-24',
          estimatedHours: 5,
        },
        {
          orgId: acme.id,
          title: 'Optimizar tiempos de despacho en centro de distribución',
          description: 'Reducir el SLA de entrega de 48h a 24h para clientes Enterprise.',
          status: 'backlog',
          priority: 'high',
          department: 'Operaciones',
          assignee: 'Mateo Rojas',
          dueDate: '2026-11-05',
          estimatedHours: 14,
        },
        {
          orgId: acme.id,
          title: 'Despliegue de nuevo modelo predictivo Argon en BDAP',
          description: 'Habilitar proyecciones financieras, simulador What-If y control multi-empresa.',
          status: 'done',
          priority: 'urgent',
          department: 'Tecnología',
          assignee: 'Carlos Mendoza',
          dueDate: '2026-10-19',
          estimatedHours: 12,
        },
        {
          orgId: globex.id,
          title: 'Conciliación de pasarelas transfronterizas Latam',
          description: 'Validación de liquidaciones en tiempo real y control de contracargos.',
          status: 'in_progress',
          priority: 'urgent',
          department: 'Riesgo & Datos',
          assignee: 'Sofía Vargas',
          dueDate: '2026-10-26',
          estimatedHours: 10,
        },
        {
          orgId: initech.id,
          title: 'Escalamiento de clústeres de inferencia multi-tenant',
          description: 'Garantizar latencia sub-15ms bajo picos concurrentes de 50 empresas.',
          status: 'in_progress',
          priority: 'high',
          department: 'Ingeniería Cloud',
          assignee: 'Mateo Rojas',
          dueDate: '2026-10-30',
          estimatedHours: 16,
        },
      ],
    });
  }

  // 6. Bitácora de Auditoría Inicial
  const existingLogs = await prisma.auditLog.count();
  if (existingLogs === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          orgId: acme.id,
          userId: admin.id,
          userEmail: admin.email,
          action: 'PLATFORM_UPGRADE',
          module: 'Seguridad',
          details: 'Arquitectura Multi-Tenant BDAP 2.0 (Argon Engine) inicializada.',
          ip: '10.0.14.21',
        },
        {
          orgId: acme.id,
          userId: analyst.id,
          userEmail: analyst.email,
          action: 'REPORT_IMPORT',
          module: 'Reportes',
          details: 'Carga verificada de 8 periodos en "Ventas y Rentabilidad Anual".',
          ip: '10.0.14.88',
        },
        {
          orgId: acme.id,
          userId: admin.id,
          userEmail: admin.email,
          action: 'GOAL_CREATED',
          module: 'Metas & OKRs',
          details: 'Configuración de 4 OKRs estratégicos para cierre de año.',
          ip: '10.0.14.21',
        },
        {
          orgId: globex.id,
          userId: admin.id,
          userEmail: admin.email,
          action: 'ORG_CREATED',
          module: 'Empresas',
          details: 'Entorno aislado aprovisionado para Globex Latam (Plan Enterprise).',
          ip: '10.0.14.21',
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed Enterprise Multi-Tenant OK');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
