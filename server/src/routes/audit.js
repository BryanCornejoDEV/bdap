import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';

const router = Router();
router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const orgId = req.orgId;
    const moduleFilter = req.query.module ? String(req.query.module).trim() : '';
    const limit = Math.min(250, Math.max(10, Number(req.query.limit) || 100));

    const where = { orgId };
    if (moduleFilter && moduleFilter !== 'ALL') {
      where.module = moduleFilter;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(logs);
  } catch (e) { next(e); }
});

export default router;
