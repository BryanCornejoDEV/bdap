import { z } from 'zod';

// Valida req.body contra un esquema zod; responde 400 con detalles si falla.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ error: 'Datos inválidos', details });
    }
    req.body = result.data;
    next();
  };
}

export const schemas = {
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Password requerido'),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Password actual requerido'),
    newPassword: z.string().min(8, 'La nueva password debe tener al menos 8 caracteres'),
  }),
  switchOrg: z.object({
    orgId: z.coerce.number().int().positive(),
  }),
  reportCreate: z.object({
    name: z.string().trim().min(1, 'name requerido').max(200),
  }),
  reportUpdate: z.object({
    name: z.string().trim().min(1, 'name requerido').max(200),
  }),
  rowCreate: z.object({
    month: z.string().trim().min(1, 'month requerido').max(20),
    revenue: z.coerce.number().int('revenue debe ser entero').min(0),
    orders: z.coerce.number().int('orders debe ser entero').min(0),
  }),
  orgCreate: z.object({
    name: z.string().trim().min(1, 'name requerido').max(200),
  }),
  memberAdd: z.object({
    userId: z.coerce.number().int().positive().optional(),
    email: z.string().email().optional(),
    role: z.enum(['owner', 'member']).default('member'),
  }).refine((d) => d.userId != null || d.email, { message: 'userId o email requerido' }),
  userCreate: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La password debe tener al menos 8 caracteres'),
    role: z.enum(['admin', 'analyst']).default('analyst'),
  }),
  userUpdate: z.object({
    role: z.enum(['admin', 'analyst']).optional(),
    password: z.string().min(8, 'La password debe tener al menos 8 caracteres').optional(),
  }).refine((d) => d.role || d.password, { message: 'Nada que actualizar' }),
};
