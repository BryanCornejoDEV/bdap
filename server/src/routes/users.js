import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, authorizeRoles, hashPassword } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { logAudit } from '../lib/tenantEngine.js';

const router = Router();

router.use(authMiddleware, authorizeRoles('admin'));

const publicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  memberships: {
    select: {
      orgId: true,
      role: true,
      department: true,
      org: { select: { id: true, name: true } },
    },
  },
};

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: publicSelect, orderBy: { id: 'asc' } });
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.userCreate), async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });
    const hashed = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashed,
        role,
      },
    });

    // Asignar por defecto a la organización activa del administrador para acceso inmediato
    const defaultOrgId = req.user?.orgId || 1;
    const orgExists = await prisma.organization.findUnique({ where: { id: defaultOrgId } });
    if (orgExists) {
      await prisma.membership.upsert({
        where: { userId_orgId: { userId: created.id, orgId: orgExists.id } },
        update: {},
        create: {
          userId: created.id,
          orgId: orgExists.id,
          role: role === 'admin' ? 'owner' : 'member',
          department: 'Analítica',
        },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: created.id }, select: publicSelect });

    await logAudit(req, {
      action: 'USER_CREATED',
      module: 'Usuarios',
      details: `Cuenta "${user.email}" creada con rol global "${user.role}"`,
    });

    res.status(201).json(user);
  } catch (e) { next(e); }
});

router.patch('/:id', validateBody(schemas.userUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { role, password, name } = req.body;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (role && role !== 'admin' && id === req.user.sub) {
      const admins = await prisma.user.count({ where: { role: 'admin' } });
      if (admins <= 1) return res.status(400).json({ error: 'No se puede degradar al último admin' });
    }
    const data = {};
    if (role) data.role = role;
    if (name !== undefined) data.name = name;
    if (password) data.password = await hashPassword(password);
    const user = await prisma.user.update({ where: { id }, data, select: publicSelect });

    await logAudit(req, {
      action: 'USER_UPDATED',
      module: 'Usuarios',
      details: `Usuario "${user.email}" actualizado (${role ? `rol -> ${role}` : 'credenciales/perfil'})`,
    });

    res.json(user);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.sub) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    await prisma.membership.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await logAudit(req, {
      action: 'USER_DELETED',
      module: 'Usuarios',
      details: `Cuenta "${target.email}" revocada y eliminada del sistema`,
    });

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
