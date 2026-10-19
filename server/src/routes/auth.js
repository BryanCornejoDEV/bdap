import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { comparePassword, hashPassword, signJwt, authMiddleware, rateLimit } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { logAudit } from '../lib/tenantEngine.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 60_000, max: 20 });

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
    const token = signJwt({ sub: user.id, email: user.email, name: user.name || '', role: user.role, orgId });

    if (orgId) {
      await logAudit(
        { headers: req.headers, ip: req.ip, user: { sub: user.id, email: user.email, orgId } },
        { orgId, action: 'USER_LOGIN', module: 'Seguridad', details: `Inicio de sesión exitoso (${user.email})` }
      );
    }

    res.json({ token });
  } catch (e) { next(e); }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    id: req.user.sub,
    email: req.user.email,
    name: req.user.name || '',
    role: req.user.role,
    orgId: req.user.orgId ?? null,
  });
});

router.post('/logout', authMiddleware, async (_req, res) => {
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

    await logAudit(req, {
      action: 'PASSWORD_CHANGED',
      module: 'Seguridad',
      details: `Credenciales de acceso actualizadas por ${user.email}`,
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Cambiar de organización (devuelve nuevo token con orgId)
router.post('/switch-org', authMiddleware, validateBody(schemas.switchOrg), async (req, res, next) => {
  try {
    const { orgId } = req.body;
    const exists = await prisma.membership.findUnique({ where: { userId_orgId: { userId: req.user.sub, orgId } } });
    if (!exists && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No pertenece a la organización' });
    }
    const token = signJwt({
      sub: req.user.sub,
      email: req.user.email,
      name: req.user.name || '',
      role: req.user.role,
      orgId,
    });

    await logAudit(req, {
      orgId,
      action: 'ORG_SWITCHED',
      module: 'Seguridad',
      details: `Cambio de contexto activo a Organización #${orgId}`,
    });

    res.json({ token });
  } catch (e) { next(e); }
});

export default router;
