import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import { validateBody, schemas } from '../utils/validate.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
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
    const rowNum = idx + 2; // considerando fila 1 como encabezado
    let month, revenueRaw, ordersRaw;

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

    // Fallback posicional si no hay nombres coincidentes
    const values = Object.values(row);
    if (month == null && values.length >= 3) {
      month = values[0];
      revenueRaw = values[1];
      ordersRaw = values[2];
    }

    const monthStr = month != null ? String(month).trim() : '';
    const revenueNum = cleanNumber(revenueRaw);
    const ordersNum = cleanNumber(ordersRaw);

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
      });
    }
  });

  return { validRows, errors, total: rawRows.length };
}

const router = Router();

router.use(authMiddleware, withOrg());

router.get('/', async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({ where: { orgId: req.orgId }, orderBy: { createdAt: 'desc' } });
    res.json(reports);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schemas.reportCreate), async (req, res, next) => {
  try {
    const report = await prisma.report.create({ data: { name: req.body.name, orgId: req.orgId } });
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
    const updated = await prisma.report.updateMany({ where: { id, orgId: req.orgId }, data: { name: req.body.name } });
    if (updated.count === 0) return res.status(404).json({ error: 'Report no encontrado' });
    const refreshed = await prisma.report.findUnique({ where: { id } });
    res.json(refreshed);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // Delete rows only if the report belongs to the org
    await prisma.metricRecord.deleteMany({ where: { reportId: id, report: { orgId: req.orgId } } });
    const deleted = await prisma.report.deleteMany({ where: { id, orgId: req.orgId } });
    if (deleted.count === 0) return res.status(404).json({ error: 'Report no encontrado' });
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/rows', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rows = await prisma.metricRecord.findMany({ where: { reportId: id, report: { orgId: req.orgId } }, orderBy: { id: 'asc' } });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:id/rows', validateBody(schemas.rowCreate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { month, revenue, orders } = req.body;
    // Ensure the report belongs to the current org before inserting
    const report = await prisma.report.findFirst({ where: { id, orgId: req.orgId } });
    if (!report) return res.status(404).json({ error: 'Report no encontrado' });
    const row = await prisma.metricRecord.create({ data: { reportId: id, month, revenue, orders } });
    res.status(201).json(row);
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

    // Inserción masiva en base de datos
    await prisma.metricRecord.createMany({
      data: validRows.map((r) => ({
        reportId: id,
        month: r.month,
        revenue: r.revenue,
        orders: r.orders,
      })),
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
      })),
    });

    res.status(201).json({ ok: true, count: rows.length });
  } catch (e) { next(e); }
});

export default router;
