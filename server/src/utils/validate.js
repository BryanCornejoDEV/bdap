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
    description: z.string().trim().max(500).optional().default(''),
    category: z.string().trim().max(80).optional().default('Finanzas'),
  }),
  reportUpdate: z.object({
    name: z.string().trim().min(1, 'name requerido').max(200).optional(),
    description: z.string().trim().max(500).optional(),
    category: z.string().trim().max(80).optional(),
  }),
  rowCreate: z.object({
    month: z.string().trim().min(1, 'month requerido').max(50),
    revenue: z.coerce.number().int('revenue debe ser entero').min(0),
    orders: z.coerce.number().int('orders debe ser entero').min(0),
    expenses: z.coerce.number().int().min(0).optional().default(0),
    customers: z.coerce.number().int().min(0).optional().default(0),
  }),
  rowUpdate: z.object({
    month: z.string().trim().min(1).max(50).optional(),
    revenue: z.coerce.number().int().min(0).optional(),
    orders: z.coerce.number().int().min(0).optional(),
    expenses: z.coerce.number().int().min(0).optional(),
    customers: z.coerce.number().int().min(0).optional(),
  }),
  orgCreate: z.object({
    name: z.string().trim().min(1, 'name requerido').max(200),
    industry: z.string().trim().max(120).optional().default('Tecnología & SaaS'),
    plan: z.enum(['starter', 'business', 'enterprise']).optional().default('enterprise'),
    currency: z.string().trim().max(10).optional().default('USD'),
  }),
  orgUpdate: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    industry: z.string().trim().max(120).optional(),
    plan: z.enum(['starter', 'business', 'enterprise']).optional(),
    currency: z.string().trim().max(10).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  }),
  memberAdd: z.object({
    userId: z.coerce.number().int().positive().optional(),
    email: z.string().email().optional(),
    role: z.enum(['owner', 'admin', 'member']).default('member'),
    department: z.string().trim().max(100).optional().default('Analítica'),
  }).refine((d) => d.userId != null || d.email, { message: 'userId o email requerido' }),
  userCreate: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().trim().max(120).optional().default(''),
    password: z.string().min(8, 'La password debe tener al menos 8 caracteres'),
    role: z.enum(['admin', 'analyst']).default('analyst'),
  }),
  userUpdate: z.object({
    name: z.string().trim().max(120).optional(),
    role: z.enum(['admin', 'analyst']).optional(),
    password: z.string().min(8, 'La password debe tener al menos 8 caracteres').optional(),
  }).refine((d) => d.role || d.password || d.name !== undefined, { message: 'Nada que actualizar' }),
  bulkRowsCreate: z.object({
    rows: z.array(z.object({
      month: z.string().trim().min(1, 'month requerido').max(50),
      revenue: z.coerce.number().int('revenue debe ser entero').min(0),
      orders: z.coerce.number().int('orders debe ser entero').min(0),
      expenses: z.coerce.number().int().min(0).optional().default(0),
      customers: z.coerce.number().int().min(0).optional().default(0),
    })).min(1, 'Se requiere al menos una fila').max(5000, 'Máximo 5,000 filas por lote'),
  }),
  goalCreate: z.object({
    title: z.string().trim().min(1, 'Título requerido').max(200),
    category: z.string().trim().max(80).optional().default('Ventas'),
    targetValue: z.coerce.number().positive('La meta debe ser mayor a 0'),
    currentValue: z.coerce.number().min(0).optional().default(0),
    unit: z.string().trim().max(30).optional().default('USD'),
    deadline: z.string().trim().max(50).optional().default(''),
    ownerName: z.string().trim().max(100).optional().default(''),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('high'),
    status: z.enum(['on_track', 'at_risk', 'behind', 'completed']).optional().default('on_track'),
    linkedReportId: z.coerce.number().int().positive().nullable().optional(),
  }),
  goalUpdate: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().max(80).optional(),
    targetValue: z.coerce.number().positive().optional(),
    currentValue: z.coerce.number().min(0).optional(),
    unit: z.string().trim().max(30).optional(),
    deadline: z.string().trim().max(50).optional(),
    ownerName: z.string().trim().max(100).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['on_track', 'at_risk', 'behind', 'completed']).optional(),
    linkedReportId: z.coerce.number().int().positive().nullable().optional(),
  }),
  taskCreate: z.object({
    title: z.string().trim().min(1, 'Título requerido').max(200),
    description: z.string().trim().max(1000).optional().default(''),
    status: z.enum(['backlog', 'in_progress', 'review', 'done']).optional().default('backlog'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    department: z.string().trim().max(80).optional().default('Operaciones'),
    assignee: z.string().trim().max(100).optional().default(''),
    dueDate: z.string().trim().max(40).optional().default(''),
    estimatedHours: z.coerce.number().min(0).max(1000).optional().default(0),
  }),
  taskUpdate: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    status: z.enum(['backlog', 'in_progress', 'review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    department: z.string().trim().max(80).optional(),
    assignee: z.string().trim().max(100).optional(),
    dueDate: z.string().trim().max(40).optional(),
    estimatedHours: z.coerce.number().min(0).max(1000).optional(),
  }),
};

