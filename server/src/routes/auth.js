import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { comparePassword, signJwt, authMiddleware } from '../utils/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    // Tomar primera organización del usuario como contexto por defecto
    const memberships = await prisma.membership.findMany({ where: { userId: user.id }, orderBy: { orgId: 'asc' } });
    const orgId = memberships[0]?.orgId || null;
    const token = signJwt({ sub: user.id, email: user.email, role: user.role, orgId });
    res.json({ token });
  } catch (e) { next(e); }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ id: req.user.sub, email: req.user.email, role: req.user.role });
});

router.post('/logout', authMiddleware, async (_req, res) => {
  // En JWT stateless no hay server-side logout; el cliente solo elimina token
  res.json({ ok: true });
});

// Cambiar de organización (devuelve nuevo token con orgId)
router.post('/switch-org', authMiddleware, async (req, res, next) => {
  try {
    const { orgId } = req.body || {};
    if (!orgId) return res.status(400).json({ error: 'orgId requerido' });
    const exists = await prisma.membership.findUnique({ where: { userId_orgId: { userId: req.user.sub, orgId } } });
    if (!exists) return res.status(403).json({ error: 'No pertenece a la organización' });
    const token = signJwt({ sub: req.user.sub, email: req.user.email, role: req.user.role, orgId });
    res.json({ token });
  } catch (e) { next(e); }
});

export default router;
