import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth.js';

const prisma = new PrismaClient();
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

// Listar organizaciones del usuario actual
router.get('/', async (req, res, next) => {
  try {
    const ms = await prisma.membership.findMany({
      where: { userId: req.user.sub },
      include: { org: true },
      orderBy: { orgId: 'asc' },
    });
    const orgs = ms.map((m) => ({ id: m.org.id, name: m.org.name, role: m.role }));
    res.json(orgs);
  } catch (e) { next(e); }
});

// Crear una organización y asignar al usuario como owner
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body || {};
    ensure(!!name, 400, 'name requerido');
    const org = await prisma.organization.create({ data: { name } });
    await prisma.membership.create({ data: { userId: req.user.sub, orgId: org.id, role: 'owner' } });
    res.status(201).json(org);
  } catch (e) { next(e); }
});

// Obtener detalle de organización si es miembro
router.get('/:id', async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const membership = await getMembership(req.user.sub, orgId);
    ensure(!!membership || req.user.role === 'admin', 403, 'Forbidden');
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    ensure(!!org, 404, 'Org no encontrada');
    res.json(org);
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
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: [{ role: 'asc' }, { userId: 'asc' }],
    });
    res.json(members.map(m => ({ userId: m.userId, email: m.user.email, userRole: m.user.role, orgRole: m.role })));
  } catch (e) { next(e); }
});

// Agregar miembro a una organización (por userId o email)
router.post('/:id/members', async (req, res, next) => {
  try {
    const orgId = Number(req.params.id);
    const actor = await getMembership(req.user.sub, orgId);
    ensure(!!actor || req.user.role === 'admin', 403, 'Forbidden');
    ensure(actor?.role === 'owner' || req.user.role === 'admin', 403, 'Solo owner/admin');
    const { userId, email, role = 'member' } = req.body || {};
    let uid = userId;
    if (!uid && email) {
      const u = await prisma.user.findUnique({ where: { email } });
      ensure(!!u, 404, 'Usuario no encontrado');
      uid = u.id;
    }
    ensure(!!uid, 400, 'userId o email requerido');
    const created = await prisma.membership.upsert({
      where: { userId_orgId: { userId: uid, orgId } },
      update: { role },
      create: { userId: uid, orgId, role },
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
    ensure(actor?.role === 'owner' || req.user.role === 'admin', 403, 'Solo owner/admin');

    // Evitar dejar la organización sin owners
    const target = await prisma.membership.findUnique({ where: { userId_orgId: { userId: targetUserId, orgId } } });
    ensure(!!target, 404, 'Miembro no encontrado');
    if (target.role === 'owner') {
      const owners = await prisma.membership.count({ where: { orgId, role: 'owner' } });
      ensure(owners > 1, 400, 'No se puede eliminar al último owner');
    }
    await prisma.membership.delete({ where: { userId_orgId: { userId: targetUserId, orgId } } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
