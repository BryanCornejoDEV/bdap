import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { tenantCache, logAudit } from '../lib/tenantEngine.js';

const router = Router();
router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const cached = tenantCache.get(req.orgId, 'tasks:list');
    if (cached) return res.json(cached);

    const tasks = await prisma.workspaceTask.findMany({
      where: { orgId: req.orgId },
      orderBy: [{ updatedAt: 'desc' }],
    });

    tenantCache.set(req.orgId, 'tasks:list', tasks, 8_000);
    res.json(tasks);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.taskCreate), async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      department,
      assignee,
      dueDate,
      estimatedHours,
    } = req.body;

    const task = await prisma.workspaceTask.create({
      data: {
        orgId: req.orgId,
        title,
        description: description || '',
        status: status || 'backlog',
        priority: priority || 'medium',
        department: department || 'Operaciones',
        assignee: assignee || req.user.email.split('@')[0],
        dueDate: dueDate || '',
        estimatedHours: estimatedHours || 0,
      },
    });

    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'TASK_CREATED',
      module: 'Workspace',
      details: `Tarea "${task.title}" creada en [${task.department}] asignada a ${task.assignee}`,
    });

    res.status(201).json(task);
  } catch (e) { next(e); }
});

router.patch('/:id', validateBody(schemas.taskUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.workspaceTask.findFirst({ where: { id, orgId: req.orgId } });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    const updated = await prisma.workspaceTask.update({
      where: { id },
      data: req.body,
    });

    tenantCache.invalidateOrg(req.orgId);
    if (req.body.status && req.body.status !== existing.status) {
      await logAudit(req, {
        action: 'TASK_STATUS_CHANGED',
        module: 'Workspace',
        details: `Tarea "${updated.title}" movida de "${existing.status}" a "${updated.status}"`,
      });
    }

    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.workspaceTask.findFirst({ where: { id, orgId: req.orgId } });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    await prisma.workspaceTask.delete({ where: { id } });
    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'TASK_DELETED',
      module: 'Workspace',
      details: `Tarea "${existing.title}" eliminada`,
    });

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
