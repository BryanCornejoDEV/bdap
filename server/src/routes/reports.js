import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';

const router = Router();

router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({ where: { orgId: req.orgId }, orderBy: { createdAt: 'desc' } });
    res.json(reports);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.reportCreate), async (req, res, next) => {
  try {
    const report = await prisma.report.create({ data: { name: req.body.name, orgId: req.orgId } });
    res.status(201).json(report);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    res.json(report);
  } catch (e) { next(e); }
});

router.put('/:id', validateBody(schemas.reportUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.report.updateMany({ where: { id, orgId: req.orgId }, data: { name: req.body.name } });
    if (updated.count === 0) return res.status(404).json({ error: 'Report no encontrado' });
    const refreshed = await prisma.report.findUnique({ where: { id } });
    res.json(refreshed);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // Delete rows only if the report belongs to the org
    await prisma.metricRecord.deleteMany({ where: { reportId: id, report: { orgId: req.orgId } } });
    const deleted = await prisma.report.deleteMany({ where: { id, orgId: req.orgId } });
    if (deleted.count === 0) return res.status(404).json({ error: 'Report no encontrado' });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/rows', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rows = await prisma.metricRecord.findMany({ where: { reportId: id, report: { orgId: req.orgId } }, orderBy: { id: 'asc' } });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:id/rows', validateBody(schemas.rowCreate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { month, revenue, orders } = req.body;
    // Ensure the report belongs to the current org before inserting
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    const row = await prisma.metricRecord.create({ data: { reportId: id, month, revenue, orders } });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.delete('/:id/rows/:rowId', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rowId = Number(req.params.rowId);
    const deleted = await prisma.metricRecord.deleteMany({
      where: { id: rowId, reportId: id, report: { orgId: req.orgId } },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Fila no encontrada' });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
