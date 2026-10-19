import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';
import { tenantCache, logAudit } from '../lib/tenantEngine.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB máximo
  fileFilter: (_req, file, cb) => {
    const isExtensionOk = file.originalname.match(/\.(csv|xlsx|xls|txt)$/i);
    if (isExtensionOk) {
      cb(null, true);
    } else {
      cb(new Error('Solo se admiten archivos .csv, .xlsx o .xls'));
    }
  },
});

function cleanNumber(val) {
  if (val == null || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

function parseSpreadsheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas de cálculo legibles');
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('La hoja de cálculo está vacía');
  }

  const validRows = [];
  const errors = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    let month, revenueRaw, ordersRaw, expensesRaw, customersRaw;

    const findProp = (patterns) => {
      for (const p of patterns) {
        for (const k of Object.keys(row)) {
          if (k.trim().toLowerCase() === p.toLowerCase()) return row[k];
        }
      }
      return undefined;
    };

    month = findProp(['month', 'mes', 'periodo', 'period', 'fecha', 'date']);
    revenueRaw = findProp(['revenue', 'ingresos', 'ventas', 'total', 'ingreso', 'monto']);
    ordersRaw = findProp(['orders', 'ordenes', 'órdenes', 'pedidos', 'cantidad', 'transacciones', 'operations']);
    expensesRaw = findProp(['expenses', 'gastos', 'costos', 'egresos', 'costs', 'costo']);
    customersRaw = findProp(['customers', 'clientes', 'usuarios', 'compradores', 'users']);

    // Fallback posicional si no hay nombres coincidentes
    const values = Object.values(row);
    if (month == null && values.length >= 3) {
      month = values[0];
      revenueRaw = values[1];
      ordersRaw = values[2];
      if (values.length >= 4) expensesRaw = values[3];
      if (values.length >= 5) customersRaw = values[4];
    }

    const monthStr = month != null ? String(month).trim() : '';
    const revenueNum = cleanNumber(revenueRaw);
    const ordersNum = cleanNumber(ordersRaw);
    const expensesNum = expensesRaw != null && expensesRaw !== '' ? cleanNumber(expensesRaw) : 0;
    const customersNum = customersRaw != null && customersRaw !== '' ? cleanNumber(customersRaw) : 0;

    if (!monthStr) {
      errors.push(`Fila ${rowNum}: Falta el mes o período.`);
    } else if (isNaN(revenueNum) || revenueNum < 0) {
      errors.push(`Fila ${rowNum}: Ingresos inválidos ("${revenueRaw}").`);
    } else if (isNaN(ordersNum) || ordersNum < 0) {
      errors.push(`Fila ${rowNum}: Órdenes inválidas ("${ordersRaw}").`);
    } else {
      validRows.push({
        month: monthStr.slice(0, 50),
        revenue: Math.round(revenueNum),
        orders: Math.round(ordersNum),
        expenses: !isNaN(expensesNum) && expensesNum >= 0 ? Math.round(expensesNum) : 0,
        customers: !isNaN(customersNum) && customersNum >= 0 ? Math.round(customersNum) : 0,
      });
    }
  });

  return { validRows, errors, total: rawRows.length };
}

const router = Router();

router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const cached = tenantCache.get(req.orgId, 'reports:list');
    if (cached) return res.json(cached);

    const reports = await prisma.report.findMany({
      where: { orgId: req.orgId },
      include: {
        _count: { select: { rows: true } },
        rows: { select: { revenue: true, expenses: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = reports.map((r) => {
      const totalRevenue = r.rows.reduce((acc, x) => acc + (x.revenue || 0), 0);
      const totalExpenses = r.rows.reduce((acc, x) => acc + (x.expenses || 0), 0);
      const totalOrders = r.rows.reduce((acc, x) => acc + (x.orders || 0), 0);
      return {
        id: r.id,
        name: r.name,
        description: r.description || '',
        category: r.category || 'Finanzas',
        orgId: r.orgId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        rowsCount: r._count.rows,
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          totalOrders,
        },
      };
    });

    tenantCache.set(req.orgId, 'reports:list', enriched, 10_000);
    res.json(enriched);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.reportCreate), async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    const report = await prisma.report.create({
      data: {
        name,
        description: description || '',
        category: category || 'Finanzas',
        orgId: req.orgId,
      },
    });
    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'REPORT_CREATED',
      module: 'Reportes',
      details: `Reporte "${report.name}" (${report.category}) creado`,
    });
    res.status(201).json(report);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    res.json(report);
  } catch (e) { next(e); }
});

router.put('/:id', validateBody(schemas.reportUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.category !== undefined) data.category = req.body.category;

    const updated = await prisma.report.updateMany({ where: { id, orgId: req.orgId }, data });
    if (updated.count === 0) return res.status(404).json({ error: 'Report no encontrado' });
    tenantCache.invalidateOrg(req.orgId);
    const refreshed = await prisma.report.findUnique({ where: { id } });
    res.json(refreshed);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!target) return res.status(404).json({ error: 'Report no encontrado' });

    await prisma.metricRecord.deleteMany({ where: { reportId: id } });
    await prisma.report.delete({ where: { id } });
    tenantCache.invalidateOrg(req.orgId);

    await logAudit(req, {
      action: 'REPORT_DELETED',
      module: 'Reportes',
      details: `Reporte "${target.name}" eliminado`,
    });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/rows', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cacheKey = `reports:${id}:rows`;
    const cached = tenantCache.get(req.orgId, cacheKey);
    if (cached) return res.json(cached);

    const rows = await prisma.metricRecord.findMany({
      where: { reportId: id, report: { orgId: req.orgId } },
      orderBy: { id: 'asc' },
    });
    tenantCache.set(req.orgId, cacheKey, rows, 10_000);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:id/rows', validateBody(schemas.rowCreate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { month, revenue, orders, expenses, customers } = req.body;
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    const row = await prisma.metricRecord.create({
      data: {
        reportId: id,
        month,
        revenue,
        orders,
        expenses: expenses || 0,
        customers: customers || 0,
      },
    });
    tenantCache.invalidateOrg(req.orgId);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.patch('/:id/rows/:rowId', validateBody(schemas.rowUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rowId = Number(req.params.rowId);
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });

    const existing = await prisma.metricRecord.findFirst({ where: { id: rowId, reportId: id } });
    if (!existing) return res.status(404).json({ error: 'Fila no encontrada' });

    const updated = await prisma.metricRecord.update({
      where: { id: rowId },
      data: req.body,
    });
    tenantCache.invalidateOrg(req.orgId);
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id/rows/:rowId', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rowId = Number(req.params.rowId);
    const deleted = await prisma.metricRecord.deleteMany({
      where: { id: rowId, reportId: id, report: { orgId: req.orgId } },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Fila no encontrada' });
    tenantCache.invalidateOrg(req.orgId);
    res.status(204).send();
  } catch (e) { next(e); }
});

// Eliminar todas las filas de un reporte
router.delete('/:id/rows', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    const deleted = await prisma.metricRecord.deleteMany({ where: { reportId: id } });
    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'REPORT_ROWS_CLEARED',
      module: 'Reportes',
      details: `Se vaciaron ${deleted.count} registros del reporte "${report.name}"`,
    });
    res.json({ ok: true, deletedCount: deleted.count });
  } catch (e) { next(e); }
});

// Importar archivo CSV o Excel (.xlsx, .xls)
router.post('/:id/import', upload.single('file'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido (.csv, .xlsx o .xls)' });
    }

    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });

    let parsed;
    try {
      parsed = parseSpreadsheet(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json({ error: parseErr.message || 'Error al procesar el archivo' });
    }

    const { validRows, errors, total } = parsed;

    if (validRows.length === 0) {
      return res.status(400).json({
        error: 'No se encontraron filas con datos válidos en el archivo.',
        details: errors.slice(0, 5),
      });
    }

    await prisma.metricRecord.createMany({
      data: validRows.map((r) => ({
        reportId: id,
        month: r.month,
        revenue: r.revenue,
        orders: r.orders,
        expenses: r.expenses || 0,
        customers: r.customers || 0,
      })),
    });

    tenantCache.invalidateOrg(req.orgId);
    await logAudit(req, {
      action: 'REPORT_IMPORT',
      module: 'Reportes',
      details: `Importación masiva de ${validRows.length} registros en "${report.name}"`,
    });

    res.status(201).json({
      ok: true,
      imported: validRows.length,
      totalRows: total,
      ignored: errors.length,
      warnings: errors.slice(0, 10),
    });
  } catch (e) { next(e); }
});

// Inserción en lote mediante payload JSON
router.post('/:id/rows/bulk', validateBody(schemas.bulkRowsCreate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });

    const rows = req.body.rows;
    await prisma.metricRecord.createMany({
      data: rows.map((r) => ({
        reportId: id,
        month: r.month,
        revenue: r.revenue,
        orders: r.orders,
        expenses: r.expenses || 0,
        customers: r.customers || 0,
      })),
    });

    tenantCache.invalidateOrg(req.orgId);
    res.status(201).json({ ok: true, count: rows.length });
  } catch (e) { next(e); }
});

export default router;
