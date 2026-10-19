import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { tenantCache, logAudit } from '../lib/tenantEngine.js';

const router = Router();
router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const cached = tenantCache.get(req.orgId, 'goals:list');
    if (cached) return res.json(cached);

    const goals = await prisma.goal.findMany({
      where: { orgId: req.orgId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    tenantCache.set(req.orgId, 'goals:list', goals, 10_000);
    res.json(goals);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.goalCreate), async (req, res, next) => {
  try {
    const {
      title,
      category,
      targetValue,
      currentValue,
      unit,
      deadline,
      ownerName,
      priority,
      status,
      linkedReportId,
    } = req.body;

    const autoStatus =
      currentValue >= targetValue
        ? 'completed'
        : status || 'on_track';

    const goal = await prisma.goal.create({
      data: {
        orgId: req.orgId,
        title,
        category: category || 'Ventas',
        targetValue,
        currentValue: currentValue || 0,
        unit: unit || 'USD',
        deadline: deadline || '',
        ownerName: ownerName || req.user.email.split('@')[0],
        priority: priority || 'high',
        status: autoStatus,
        linkedReportId: linkedReportId || null,
      },
    });

    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'GOAL_CREATED',
      module: 'Metas & OKRs',
      details: `Meta "${goal.title}" creada (Objetivo: ${goal.targetValue} ${goal.unit})`,
    });

    res.status(201).json(goal);
  } catch (e) { next(e); }
});

router.patch('/:id', validateBody(schemas.goalUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.goal.findFirst({ where: { id, orgId: req.orgId } });
    if (!existing) return res.status(404).json({ error: 'Meta no encontrada' });

    const data = { ...req.body };
    const nextCurrent = data.currentValue !== undefined ? data.currentValue : existing.currentValue;
    const nextTarget = data.targetValue !== undefined ? data.targetValue : existing.targetValue;

    if (data.status === undefined && nextTarget > 0 && nextCurrent >= nextTarget) {
      data.status = 'completed';
    }

    const updated = await prisma.goal.update({
      where: { id },
      data,
    });

    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'GOAL_UPDATED',
      module: 'Metas & OKRs',
      details: `Meta "${updated.title}" actualizada (${updated.currentValue} / ${updated.targetValue} ${updated.unit})`,
    });

    res.json(updated);
  } catch (e) { next(e); }
});

// Sincronizar el valor actual de una meta desde su reporte vinculado
router.post('/:id/sync-report', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const goal = await prisma.goal.findFirst({ where: { id, orgId: req.orgId } });
    if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });
    if (!goal.linkedReportId) {
      return res.status(400).json({ error: 'Esta meta no tiene un reporte vinculado' });
    }

    const rows = await prisma.metricRecord.findMany({
      where: { reportId: goal.linkedReportId, report: { orgId: req.orgId } },
    });

    const metricType = req.body?.metric || (goal.unit === 'USD' ? 'revenue' : 'orders');
    let syncedValue = 0;
    if (metricType === 'profit') {
      syncedValue = rows.reduce((acc, r) => acc + ((r.revenue || 0) - (r.expenses || 0)), 0);
    } else if (metricType === 'orders') {
      syncedValue = rows.reduce((acc, r) => acc + (r.orders || 0), 0);
    } else {
      syncedValue = rows.reduce((acc, r) => acc + (r.revenue || 0), 0);
    }

    const nextStatus = syncedValue >= goal.targetValue ? 'completed' : goal.status === 'completed' ? 'on_track' : goal.status;
    const updated = await prisma.goal.update({
      where: { id },
      data: { currentValue: syncedValue, status: nextStatus },
    });

    tenantCache.invalidateOrg(req.orgId);
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.goal.findFirst({ where: { id, orgId: req.orgId } });
    if (!existing) return res.status(404).json({ error: 'Meta no encontrada' });

    await prisma.goal.delete({ where: { id } });
    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'GOAL_DELETED',
      module: 'Metas & OKRs',
      details: `Meta "${existing.title}" eliminada`,
    });

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
