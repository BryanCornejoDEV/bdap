import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, authorizeRoles, hashPassword } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';

const router = Router();

router.use(authMiddleware, authorizeRoles('admin'));

const publicSelect = { id: true, email: true, role: true, createdAt: true };

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: publicSelect, orderBy: { id: 'asc' } });
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.userCreate), async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, role },
      select: publicSelect,
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

router.patch('/:id', validateBody(schemas.userUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { role, password } = req.body;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Evitar que el admin se quite su propio rol y quede el sistema sin admins
    if (role && role !== 'admin' && id === req.user.sub) {
      const admins = await prisma.user.count({ where: { role: 'admin' } });
      if (admins <= 1) return res.status(400).json({ error: 'No se puede degradar al último admin' });
    }
    const data = {};
    if (role) data.role = role;
    if (password) data.password = await hashPassword(password);
    const user = await prisma.user.update({ where: { id }, data, select: publicSelect });
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
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
