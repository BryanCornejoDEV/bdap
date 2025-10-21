import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorizeRoles } from '../utils/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

router.get('/', authorizeRoles('admin'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } });
    res.json(users);
  } catch (e) { next(e); }
});

export default router;
