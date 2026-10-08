import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { comparePassword, hashPassword, signJwt, authMiddleware, rateLimit } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 60_000, max: 10 });

router.post('/login', loginLimiter, validateBody(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;
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
  res.json({ id: req.user.sub, email: req.user.email, role: req.user.role, orgId: req.user.orgId ?? null });
});

router.post('/logout', authMiddleware, async (_req, res) => {
  // En JWT stateless no hay server-side logout; el cliente solo elimina token
  res.json({ ok: true });
});

router.post('/change-password', authMiddleware, validateBody(schemas.changePassword), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await comparePassword(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Password actual incorrecta' });
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Cambiar de organización (devuelve nuevo token con orgId)
router.post('/switch-org', authMiddleware, validateBody(schemas.switchOrg), async (req, res, next) => {
  try {
    const { orgId } = req.body;
    const exists = await prisma.membership.findUnique({ where: { userId_orgId: { userId: req.user.sub, orgId } } });
    if (!exists) return res.status(403).json({ error: 'No pertenece a la organización' });
    const token = signJwt({ sub: req.user.sub, email: req.user.email, role: req.user.role, orgId });
    res.json({ token });
  } catch (e) { next(e); }
});

export default router;
