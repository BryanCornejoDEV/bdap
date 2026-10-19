import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { getTenantTelemetry, logAudit, tenantCache } from '../lib/tenantEngine.js';

const router = Router();

router.use(authMiddleware);

async function getMembership(userId, orgId) {
  return prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
}

function ensure(condition, status, message) {
  if (!condition) {
    const err = new Error(message);
    err.status = status;
    throw err;
  }
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// Listar organizaciones del usuario actual con métricas ejecutivas consolidadas y telemetría
router.get('/', async (req, res, next) => {
  try {
    const ms = await prisma.membership.findMany({
      where: { userId: req.user.sub },
      include: {
        org: {
          include: {
            _count: {
              select: { reports: true, members: true, goals: true, tasks: true },
            },
            reports: {
              include: { rows: true },
            },
            goals: {
              select: { status: true, currentValue: true, targetValue: true },
            },
            tasks: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { orgId: 'asc' },
    });

    const orgs = ms.map((m) => {
      const o = m.org;
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalOrders = 0;
      for (const r of o.reports || []) {
        for (const row of r.rows || []) {
          totalRevenue += row.revenue || 0;
          totalExpenses += row.expenses || 0;
          totalOrders += row.orders || 0;
        }
      }

      const goalsTotal = o.goals?.length || 0;
      const goalsCompleted = (o.goals || []).filter(
        (g) => g.status === 'completed' || (g.targetValue > 0 && g.currentValue >= g.targetValue)
      ).length;

      const tasksTotal = o.tasks?.length || 0;
      const tasksDone = (o.tasks || []).filter((t) => t.status === 'done').length;

      return {
        id: o.id,
        name: o.name,
        slug: o.slug || slugify(o.name),
        industry: o.industry || 'Tecnología & SaaS',
        plan: o.plan || 'enterprise',
        currency: o.currency || 'USD',
        status: o.status || 'active',
        createdAt: o.createdAt,
        role: m.role,
        department: m.department || 'Dirección',
        counts: o._count,
        metrics: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          marginPct: totalRevenue > 0 ? Number((((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1)) : 0,
          totalOrders,
          goalsTotal,
          goalsCompleted,
          tasksTotal,
          tasksDone,
        },
        telemetry: getTenantTelemetry(o.id),
      };
    });

    res.json(orgs);
  } catch (e) { next(e); }
});

// Crear una organización y asignar al usuario como owner + inicializar entorno
router.post('/', validateBody(schemas.orgCreate), async (req, res, next) => {
  try {
    const { name, industry, plan, currency } = req.body;
    const slug = `${slugify(name)}-${Math.floor(100 + Math.random() * 900)}`;

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        industry: industry || 'Tecnología & SaaS',
        plan: plan || 'enterprise',
        currency: (currency || 'USD').toUpperCase(),
      },
    });

    await prisma.membership.create({
      data: {
        userId: req.user.sub,
        orgId: org.id,
        role: 'owner',
        department: 'Dirección Ejecutiva',
      },
    });

    // Crear reporte inicial para que la nueva empresa tenga estructura inmediata
    const report = await prisma.report.create({
      data: {
        name: 'Operaciones y Ventas (Inicial)',
        description: 'Reporte financiero principal generado automáticamente al registrar la empresa.',
        category: 'Finanzas',
        orgId: org.id,
      },
    });

    await prisma.metricRecord.createMany({
      data: [
        { reportId: report.id, month: 'Ene', revenue: 18500, orders: 210, expenses: 11200, customers: 85 },
        { reportId: report.id, month: 'Feb', revenue: 22400, orders: 255, expenses: 12800, customers: 104 },
        { reportId: report.id, month: 'Mar', revenue: 26900, orders: 310, expenses: 14100, customers: 128 },
      ],
    });

    await logAudit(req, {
      orgId: org.id,
      action: 'ORG_CREATED',
      module: 'Empresas',
      details: `Empresa "${org.name}" (${org.plan.toUpperCase()}) inicializada con aislamiento multi-tenant`,
    });

    res.status(201).json(org);
  } catch (e) { next(e); }
});

// Obtener detalle de organización si es miembro
router.get('/:id', async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const membership = await getMembership(req.user.sub, orgId);
    ensure(!!membership || req.user.role === 'admin', 403, 'Forbidden');
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { reports: true, members: true, goals: true, tasks: true, auditLogs: true } },
      },
    });
    ensure(!!org, 404, 'Org no encontrada');
    res.json({ ...org, telemetry: getTenantTelemetry(orgId) });
  } catch (e) { next(e); }
});

// Actualizar parámetros de una organización (nombre, industria, plan, moneda)
router.patch('/:id', validateBody(schemas.orgUpdate), async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const actor = await getMembership(req.user.sub, orgId);
    ensure(!!actor || req.user.role === 'admin', 403, 'Forbidden');
    ensure(actor?.role === 'owner' || actor?.role === 'admin' || req.user.role === 'admin', 403, 'Solo owner/admin');

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: req.body,
    });

    tenantCache.invalidateOrg(orgId);
    await logAudit(req, {
      orgId,
      action: 'ORG_UPDATED',
      module: 'Empresas',
      details: `Configuración corporativa actualizada para "${updated.name}"`,
    });

    res.json(updated);
  } catch (e) { next(e); }
});

// Listar miembros de una organización
router.get('/:id/members', async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const membership = await getMembership(req.user.sub, orgId);
    ensure(!!membership || req.user.role === 'admin', 403, 'Forbidden');
    const members = await prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
      orderBy: [{ role: 'asc' }, { userId: 'asc' }],
    });
    res.json(
      members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        name: m.user.name || m.user.email.split('@')[0],
        userRole: m.user.role,
        orgRole: m.role,
        department: m.department || 'Analítica',
        joinedAt: m.createdAt,
      }))
    );
  } catch (e) { next(e); }
});

// Agregar o actualizar miembro en una organización (por userId o email)
router.post('/:id/members', validateBody(schemas.memberAdd), async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const actor = await getMembership(req.user.sub, orgId);
    ensure(!!actor || req.user.role === 'admin', 403, 'Forbidden');
    ensure(actor?.role === 'owner' || actor?.role === 'admin' || req.user.role === 'admin', 403, 'Solo owner/admin');
    const { userId, email, role, department } = req.body;
    let uid = userId;
    let targetEmail = email;
    if (!uid && email) {
      const u = await prisma.user.findUnique({ where: { email } });
      ensure(!!u, 404, 'Usuario no encontrado con ese email');
      uid = u.id;
      targetEmail = u.email;
    }
    ensure(!!uid, 400, 'userId o email requerido');
    const created = await prisma.membership.upsert({
      where: { userId_orgId: { userId: uid, orgId } },
      update: { role, ...(department ? { department } : {}) },
      create: { userId: uid, orgId, role, department: department || 'Analítica' },
    });

    await logAudit(req, {
      orgId,
      action: 'MEMBER_UPSERTED',
      module: 'Empresas',
      details: `Miembro ${targetEmail || uid} asignado con rol "${role}" (${department || 'Analítica'})`,
    });

    res.status(201).json(created);
  } catch (e) { next(e); }
});

// Eliminar miembro de una organización
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const actor = await getMembership(req.user.sub, orgId);
    ensure(!!actor || req.user.role === 'admin', 403, 'Forbidden');
    ensure(actor?.role === 'owner' || actor?.role === 'admin' || req.user.role === 'admin', 403, 'Solo owner/admin');

    const target = await prisma.membership.findUnique({ where: { userId_orgId: { userId: targetUserId, orgId } } });
    ensure(!!target, 404, 'Miembro no encontrado');
    if (target.role === 'owner') {
      const owners = await prisma.membership.count({ where: { orgId, role: 'owner' } });
      ensure(owners > 1, 400, 'No se puede eliminar al último owner');
    }
    await prisma.membership.delete({ where: { userId_orgId: { userId: targetUserId, orgId } } });

    await logAudit(req, {
      orgId,
      action: 'MEMBER_REMOVED',
      module: 'Empresas',
      details: `Usuario #${targetUserId} revocado de la organización`,
    });

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
