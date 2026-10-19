/* eslint-env node */
/* global process */
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, withOrg } from '../utils/auth.js';
import {
  testStripeConnection,
  fetchStripeRevenue,
  fetchStripeMonthlyBreakdown,
} from '../services/stripeService.js';
import {
  testHubspotConnection,
  fetchHubspotLeads,
} from '../services/hubspotService.js';
import {
  testGaConnection,
  fetchGaKpis,
  fetchGaMonthlyBreakdown,
} from '../services/googleAnalyticsService.js';

const router = Router();
router.use(authMiddleware, withOrg());

// Helper para enmascarar claves y tokens sensibles
function maskSecret(val) {
  if (!val || typeof val !== 'string') return '';
  const s = val.trim();
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

// Helper para parsear la configuración guardada de un proveedor
async function getStoredConfig(orgId, provider) {
  const record = await prisma.integrationConfig.findUnique({
    where: { orgId_provider: { orgId, provider } },
  });
  if (!record) return null;
  try {
    const parsed = JSON.parse(record.config);
    return { ...parsed, enabled: record.enabled, updatedAt: record.updatedAt, id: record.id };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 1. GET /api/integrations/configs
// Lista las configuraciones y estado de cada integración para la organización
// -------------------------------------------------------------
router.get('/configs', async (req, res, next) => {
  try {
    const orgId = req.orgId;
    const configs = await prisma.integrationConfig.findMany({
      where: { orgId },
    });

    const configMap = {};
    for (const c of configs) {
      try {
        configMap[c.provider] = {
          ...JSON.parse(c.config),
          enabled: c.enabled,
          updatedAt: c.updatedAt,
        };
      } catch {
        configMap[c.provider] = { enabled: c.enabled, updatedAt: c.updatedAt };
      }
    }

    const stripeCfg = configMap['stripe'];
    const hubCfg = configMap['hubspot'];
    const gaCfg = configMap['google-analytics'];

    res.json({
      stripe: {
        configured: !!(stripeCfg?.apiKey || process.env.STRIPE_API_KEY),
        enabled: stripeCfg ? stripeCfg.enabled : true,
        maskedApiKey: maskSecret(stripeCfg?.apiKey || process.env.STRIPE_API_KEY),
        currency: stripeCfg?.currency || 'USD',
        isDemo: stripeCfg?.isDemo ?? false,
        fromEnv: !stripeCfg?.apiKey && !!process.env.STRIPE_API_KEY,
        updatedAt: stripeCfg?.updatedAt || null,
      },
      hubspot: {
        configured: !!(hubCfg?.accessToken || process.env.HUBSPOT_ACCESS_TOKEN),
        enabled: hubCfg ? hubCfg.enabled : true,
        maskedAccessToken: maskSecret(hubCfg?.accessToken || process.env.HUBSPOT_ACCESS_TOKEN),
        isDemo: hubCfg?.isDemo ?? false,
        fromEnv: !hubCfg?.accessToken && !!process.env.HUBSPOT_ACCESS_TOKEN,
        updatedAt: hubCfg?.updatedAt || null,
      },
      'google-analytics': {
        configured: !!((gaCfg?.propertyId && (gaCfg?.privateKey || gaCfg?.accessToken)) || (process.env.GA_PROPERTY_ID && process.env.GA_PRIVATE_KEY)),
        enabled: gaCfg ? gaCfg.enabled : true,
        propertyId: gaCfg?.propertyId || process.env.GA_PROPERTY_ID || '',
        clientEmail: gaCfg?.clientEmail || process.env.GA_CLIENT_EMAIL || '',
        hasPrivateKey: !!(gaCfg?.privateKey || process.env.GA_PRIVATE_KEY),
        hasAccessToken: !!gaCfg?.accessToken,
        isDemo: gaCfg?.isDemo ?? false,
        fromEnv: !gaCfg?.propertyId && !!process.env.GA_PROPERTY_ID,
        updatedAt: gaCfg?.updatedAt || null,
      },
    });
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------------------
// 2. POST /api/integrations/configs/:provider
// Guarda o actualiza credenciales de un proveedor para la organización
// -------------------------------------------------------------
router.post('/configs/:provider', async (req, res, next) => {
  try {
    const orgId = req.orgId;
    const { provider } = req.params;
    if (!['stripe', 'hubspot', 'google-analytics'].includes(provider)) {
      return res.status(400).json({ error: 'Proveedor no válido' });
    }

    const current = await getStoredConfig(orgId, provider);
    let newConfig = {};

    if (provider === 'stripe') {
      const apiKey = req.body.apiKey?.trim();
      const isMaskedOrEmpty = !apiKey || apiKey.includes('••••');
      const preservedKey = isMaskedOrEmpty ? (current?.apiKey || '') : apiKey;

      newConfig = {
        apiKey: preservedKey,
        currency: req.body.currency ? String(req.body.currency).toUpperCase() : (current?.currency || 'USD'),
        isDemo: Boolean(req.body.isDemo),
      };
    } else if (provider === 'hubspot') {
      const accessToken = req.body.accessToken?.trim();
      const isMaskedOrEmpty = !accessToken || accessToken.includes('••••');
      const preservedToken = isMaskedOrEmpty ? (current?.accessToken || '') : accessToken;

      newConfig = {
        accessToken: preservedToken,
        isDemo: Boolean(req.body.isDemo),
      };
    } else if (provider === 'google-analytics') {
      const privateKey = req.body.privateKey?.trim();
      const accessToken = req.body.accessToken?.trim();
      const isPrivateKeyMasked = !privateKey || privateKey.includes('••••');
      const isTokenMasked = !accessToken || accessToken.includes('••••');

      newConfig = {
        propertyId: (req.body.propertyId != null ? String(req.body.propertyId).trim() : current?.propertyId) || '',
        clientEmail: (req.body.clientEmail != null ? String(req.body.clientEmail).trim() : current?.clientEmail) || '',
        privateKey: isPrivateKeyMasked ? (current?.privateKey || '') : privateKey,
        accessToken: isTokenMasked ? (current?.accessToken || '') : accessToken,
        isDemo: Boolean(req.body.isDemo),
      };
    }

    const enabled = req.body.enabled !== undefined ? Boolean(req.body.enabled) : true;

    const upserted = await prisma.integrationConfig.upsert({
      where: { orgId_provider: { orgId, provider } },
      create: {
        orgId,
        provider,
        config: JSON.stringify(newConfig),
        enabled,
      },
      update: {
        config: JSON.stringify(newConfig),
        enabled,
      },
    });

    res.json({
      ok: true,
      provider: upserted.provider,
      enabled: upserted.enabled,
      updatedAt: upserted.updatedAt,
      message: 'Configuración guardada correctamente',
    });
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------------------
// 3. DELETE /api/integrations/configs/:provider
// Desconecta y elimina la configuración guardada
// -------------------------------------------------------------
router.delete('/configs/:provider', async (req, res, next) => {
  try {
    const orgId = req.orgId;
    const { provider } = req.params;

    await prisma.integrationConfig.deleteMany({
      where: { orgId, provider },
    });

    res.json({ ok: true, message: `Integración ${provider} desconectada` });
  } catch (e) {
    next(e);
  }
});

// -------------------------------------------------------------
// 4. POST /api/integrations/:provider/test
// Prueba la conexión en tiempo real con las credenciales
// -------------------------------------------------------------
router.post('/:provider/test', async (req, res) => {
  const { provider } = req.params;
  const orgId = req.orgId;
  const current = await getStoredConfig(orgId, provider);

  try {
    if (provider === 'stripe') {
      const inputKey = req.body.apiKey?.trim();
      const apiKey = (inputKey && !inputKey.includes('••••'))
        ? inputKey
        : (current?.apiKey || process.env.STRIPE_API_KEY);

      if (!apiKey) {
        return res.status(400).json({ ok: false, error: 'Proporciona una API Key de Stripe para probar' });
      }

      const result = await testStripeConnection(apiKey);
      return res.json(result);
    }

    if (provider === 'hubspot') {
      const inputToken = req.body.accessToken?.trim();
      const accessToken = (inputToken && !inputToken.includes('••••'))
        ? inputToken
        : (current?.accessToken || process.env.HUBSPOT_ACCESS_TOKEN);

      if (!accessToken) {
        return res.status(400).json({ ok: false, error: 'Proporciona un Access Token de HubSpot para probar' });
      }

      const result = await testHubspotConnection(accessToken);
      return res.json(result);
    }

    if (provider === 'google-analytics') {
      const propertyId = req.body.propertyId?.trim() || current?.propertyId || process.env.GA_PROPERTY_ID;
      const clientEmail = req.body.clientEmail?.trim() || current?.clientEmail || process.env.GA_CLIENT_EMAIL;
      const inputPk = req.body.privateKey?.trim();
      const privateKey = (inputPk && !inputPk.includes('••••'))
        ? inputPk
        : (current?.privateKey || process.env.GA_PRIVATE_KEY);
      const inputToken = req.body.accessToken?.trim();
      const accessToken = (inputToken && !inputToken.includes('••••'))
        ? inputToken
        : (current?.accessToken || null);

      if (!propertyId) {
        return res.status(400).json({ ok: false, error: 'Property ID de GA4 es requerido' });
      }
      if (!accessToken && (!clientEmail || !privateKey)) {
        return res.status(400).json({ ok: false, error: 'Credenciales del Service Account (Email y Clave Privada) o Access Token son requeridos' });
      }

      const result = await testGaConnection({ propertyId, clientEmail, privateKey, accessToken });
      return res.json(result);
    }

    return res.status(400).json({ ok: false, error: 'Proveedor no soportado' });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message || 'Fallo de conexión' });
  }
});

// -------------------------------------------------------------
// 5. GET /api/integrations/google-analytics/kpis
// KPIs reales de GA4 o simulación contextual
// -------------------------------------------------------------
router.get('/google-analytics/kpis', async (req, res) => {
  const orgId = req.orgId;
  const current = await getStoredConfig(orgId, 'google-analytics');
  const isDemo = current?.isDemo || req.query.demo === 'true';

  const propertyId = current?.propertyId || process.env.GA_PROPERTY_ID;
  const clientEmail = current?.clientEmail || process.env.GA_CLIENT_EMAIL;
  const privateKey = current?.privateKey || process.env.GA_PRIVATE_KEY;
  const accessToken = current?.accessToken;

  const hasCredentials = propertyId && (accessToken || (clientEmail && privateKey));

  if (hasCredentials && !isDemo && (current?.enabled ?? true)) {
    try {
      const liveData = await fetchGaKpis(
        { propertyId, clientEmail, privateKey, accessToken },
        { startDate: req.query.startDate, endDate: req.query.endDate }
      );
      return res.json(liveData);
    } catch (err) {
      console.warn('[GA Integration Error]:', err.message);
      // Retorna indicador de error en vivo pero incluye datos de respaldo para no romper la vista
      return res.json({
        source: 'error_fallback',
        configured: true,
        error: `Error al consultar GA4: ${err.message}`,
        sessions: 12034,
        users: 9812,
        bounceRate: 0.42,
        avgSession: 154,
      });
    }
  }

  // Datos de demostración / no configurado
  res.json({
    source: 'simulated',
    configured: Boolean(hasCredentials),
    isDemo: Boolean(isDemo),
    sessions: 12034,
    users: 9812,
    bounceRate: 0.42,
    avgSession: 154,
  });
});

// -------------------------------------------------------------
// 6. GET /api/integrations/stripe/revenue
// Ingresos y MRR reales de Stripe o simulación
// -------------------------------------------------------------
router.get('/stripe/revenue', async (req, res) => {
  const orgId = req.orgId;
  const current = await getStoredConfig(orgId, 'stripe');
  const isDemo = current?.isDemo || req.query.demo === 'true';

  const apiKey = current?.apiKey || process.env.STRIPE_API_KEY;
  const hasCredentials = Boolean(apiKey);

  if (hasCredentials && !isDemo && (current?.enabled ?? true)) {
    try {
      const liveData = await fetchStripeRevenue(apiKey, { currency: current?.currency || 'USD' });
      return res.json(liveData);
    } catch (err) {
      console.warn('[Stripe Integration Error]:', err.message);
      return res.json({
        source: 'error_fallback',
        configured: true,
        error: `Error al consultar Stripe: ${err.message}`,
        currency: current?.currency || 'USD',
        total: 123456,
        mrr: 18999,
        arr: 18999 * 12,
        availableBalance: 24500,
        pendingBalance: 3200,
        chargesCount: 42,
        recentTransactions: [],
      });
    }
  }

  res.json({
    source: 'simulated',
    configured: hasCredentials,
    isDemo: Boolean(isDemo),
    currency: current?.currency || 'USD',
    total: 123456,
    mrr: 18999,
    arr: 18999 * 12,
    availableBalance: 24500,
    pendingBalance: 3200,
    chargesCount: 42,
    recentTransactions: [
      { id: 'ch_sim_1', amount: 499, currency: 'USD', customer: 'Acme Corp', status: 'succeeded', date: new Date().toISOString(), description: 'Suscripción Enterprise' },
      { id: 'ch_sim_2', amount: 199, currency: 'USD', customer: 'Globex Ltd', status: 'succeeded', date: new Date(Date.now() - 86400000).toISOString(), description: 'Plan Pro Mensual' },
    ],
  });
});

// -------------------------------------------------------------
// 7. GET /api/integrations/hubspot/leads
// Leads y contactos reales de HubSpot CRM o simulación
// -------------------------------------------------------------
router.get('/hubspot/leads', async (req, res) => {
  const orgId = req.orgId;
  const current = await getStoredConfig(orgId, 'hubspot');
  const isDemo = current?.isDemo || req.query.demo === 'true';

  const accessToken = current?.accessToken || process.env.HUBSPOT_ACCESS_TOKEN;
  const hasCredentials = Boolean(accessToken);

  if (hasCredentials && !isDemo && (current?.enabled ?? true)) {
    try {
      const liveData = await fetchHubspotLeads(accessToken, { limit: 25 });
      // Para compatibilidad retroactiva con componentes que iteren directamente o lean .leads
      const arrayWithMeta = [...liveData.leads];
      arrayWithMeta.source = 'live';
      arrayWithMeta.configured = true;
      arrayWithMeta.total = liveData.total;
      return res.json(arrayWithMeta);
    } catch (err) {
      console.warn('[HubSpot Integration Error]:', err.message);
      const fallbackArray = [
        { id: 1, name: 'Acme Inc', email: 'contacto@acme.com', company: 'Acme Inc', status: 'OPEN', owner: 'Ana' },
        { id: 2, name: 'Globex', email: 'info@globex.org', company: 'Globex', status: 'WON', owner: 'Luis' },
      ];
      fallbackArray.source = 'error_fallback';
      fallbackArray.configured = true;
      fallbackArray.error = `Error al consultar HubSpot: ${err.message}`;
      return res.json(fallbackArray);
    }
  }

  const simulatedLeads = [
    { id: 1, name: 'Acme Inc', email: 'contacto@acme.com', company: 'Acme Inc', status: 'OPEN', owner: 'Ana' },
    { id: 2, name: 'Globex', email: 'info@globex.org', company: 'Globex', status: 'WON', owner: 'Luis' },
    { id: 3, name: 'Initech Systems', email: 'peter@initech.local', company: 'Initech', status: 'IN_PROGRESS', owner: 'Carlos' },
    { id: 4, name: 'Soylent Health', email: 'contact@soylent.com', company: 'Soylent', status: 'QUALIFIED', owner: 'Ana' },
  ];
  simulatedLeads.source = 'simulated';
  simulatedLeads.configured = hasCredentials;
  simulatedLeads.isDemo = Boolean(isDemo);

  res.json(simulatedLeads);
});

// -------------------------------------------------------------
// 8. POST /api/integrations/:provider/sync-to-report
// Importa las métricas de la integración como filas en un reporte de BDAP
// -------------------------------------------------------------
router.post('/:provider/sync-to-report', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const orgId = req.orgId;
    const { reportId, newReportName } = req.body;

    let targetReportId = reportId ? Number(reportId) : null;

    // Si se especificó crear un reporte nuevo
    if (!targetReportId && newReportName) {
      const created = await prisma.report.create({
        data: { name: newReportName.trim(), orgId },
      });
      targetReportId = created.id;
    }

    if (!targetReportId) {
      return res.status(400).json({ error: 'Debes seleccionar un reporte existente o especificar el nombre de un nuevo reporte' });
    }

    // Verificar pertenencia del reporte a la organización
    const report = await prisma.report.findFirst({
      where: { id: targetReportId, orgId },
    });
    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado en esta organización' });
    }

    const current = await getStoredConfig(orgId, provider);
    let rowsToInsert = [];

    if (provider === 'stripe') {
      const apiKey = current?.apiKey || process.env.STRIPE_API_KEY;
      if (apiKey && !current?.isDemo) {
        rowsToInsert = await fetchStripeMonthlyBreakdown(apiKey);
      } else {
        // Filas de demostración derivadas de Stripe
        rowsToInsert = [
          { month: 'Ene', revenue: 14200, orders: 120 },
          { month: 'Feb', revenue: 16800, orders: 145 },
          { month: 'Mar', revenue: 18900, orders: 162 },
          { month: 'Abr', revenue: 21400, orders: 180 },
          { month: 'May', revenue: 24100, orders: 205 },
          { month: 'Jun', revenue: 26500, orders: 228 },
        ];
      }
    } else if (provider === 'google-analytics') {
      const propertyId = current?.propertyId || process.env.GA_PROPERTY_ID;
      const clientEmail = current?.clientEmail || process.env.GA_CLIENT_EMAIL;
      const privateKey = current?.privateKey || process.env.GA_PRIVATE_KEY;
      const accessToken = current?.accessToken;

      if (propertyId && (accessToken || (clientEmail && privateKey)) && !current?.isDemo) {
        rowsToInsert = await fetchGaMonthlyBreakdown({ propertyId, clientEmail, privateKey, accessToken });
      } else {
        rowsToInsert = [
          { month: 'Ene', revenue: 9400, orders: 8100 },
          { month: 'Feb', revenue: 10200, orders: 8700 },
          { month: 'Mar', revenue: 11500, orders: 9400 },
          { month: 'Abr', revenue: 12034, orders: 9812 },
        ];
      }
    } else {
      return res.status(400).json({ error: 'Este proveedor no soporta sincronización de series temporales a reportes' });
    }

    if (!rowsToInsert || rowsToInsert.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos para sincronizar en el período' });
    }

    // Insertar registros en MetricRecord
    await prisma.metricRecord.createMany({
      data: rowsToInsert.map((r) => ({
        reportId: targetReportId,
        month: String(r.month).slice(0, 50),
        revenue: Math.round(Number(r.revenue) || 0),
        orders: Math.round(Number(r.orders) || 0),
      })),
    });

    res.status(201).json({
      ok: true,
      reportId: targetReportId,
      reportName: report.name,
      rowsCount: rowsToInsert.length,
      message: `Se sincronizaron con éxito ${rowsToInsert.length} períodos desde ${provider} al reporte "${report.name}".`,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
