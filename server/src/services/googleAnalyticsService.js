/* eslint-env node */
/**
 * Servicio de integración con Google Analytics 4 (GA4 Data API v1beta)
 */
import jwt from 'jsonwebtoken';

const GA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';

/**
 * Obtiene un token de acceso OAuth2 usando una cuenta de servicio de Google (JWT bearer).
 */
async function getServiceAccountAccessToken(clientEmail, privateKey) {
  if (!clientEmail || !privateKey) {
    throw new Error('clientEmail y privateKey son requeridos para la cuenta de servicio de Google');
  }

  // Normalizar formato de la clave privada (reemplazar saltos de línea escapados si vienen de env o JSON)
  const normalizedKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: GA_SCOPES,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  let signedJwt;
  try {
    signedJwt = jwt.sign(payload, normalizedKey, { algorithm: 'RS256' });
  } catch (signErr) {
    throw new Error(`Error firmando credenciales de Google Service Account: ${signErr.message}`);
  }

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error_description || data.error || `Error obteniendo token de Google (${res.status})`;
    throw new Error(errorMsg);
  }

  return data.access_token;
}

/**
 * Resuelve el token de acceso ya sea desde Service Account o token directo.
 */
async function resolveAccessToken(config) {
  if (config.accessToken && config.accessToken.trim()) {
    return config.accessToken.trim();
  }
  if (config.clientEmail && config.privateKey) {
    return getServiceAccountAccessToken(config.clientEmail.trim(), config.privateKey);
  }
  throw new Error('Se requieren credenciales válidas (Service Account email + private key, o access token)');
}

/**
 * Normaliza el identificador de la propiedad de GA4 (remueve prefijo 'properties/' si viene incluido).
 */
function normalizePropertyId(propertyId) {
  if (!propertyId) throw new Error('GA4 Property ID es requerido');
  const clean = String(propertyId).trim();
  return clean.replace(/^properties\//, '');
}

/**
 * Prueba la conexión con Google Analytics 4 ejecutando una consulta mínima de 1 día.
 */
export async function testGaConnection(config) {
  const propertyId = normalizePropertyId(config.propertyId);
  const token = await resolveAccessToken(config);

  const url = `${GA_API_BASE}/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
      limit: 1,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || `Error de Google Analytics API HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    ok: true,
    message: `Conexión exitosa con Google Analytics 4 (Propiedad: ${propertyId})`,
    propertyId,
  };
}

/**
 * Obtiene KPIs consolidados (Sesiones, Usuarios, Tasa de rebote, Duración media).
 */
export async function fetchGaKpis(config, { startDate = '30daysAgo', endDate = 'today' } = {}) {
  const propertyId = normalizePropertyId(config.propertyId);
  const token = await resolveAccessToken(config);

  const url = `${GA_API_BASE}/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || `Error de Google Analytics API HTTP ${res.status}`;
    throw new Error(msg);
  }

  const row = data.rows?.[0];
  const metricValues = row?.metricValues || [];

  const sessions = Number(metricValues[0]?.value || 0);
  const users = Number(metricValues[1]?.value || 0);
  const bounceRate = Number(parseFloat(metricValues[2]?.value || 0).toFixed(4));
  const avgSession = Math.round(Number(metricValues[3]?.value || 0));

  return {
    source: 'live',
    configured: true,
    propertyId,
    dateRange: { startDate, endDate },
    sessions,
    users,
    bounceRate,
    avgSession,
  };
}

/**
 * Obtiene desglose mensual de sesiones y usuarios para sincronizar con reportes BDAP.
 */
export async function fetchGaMonthlyBreakdown(config) {
  const propertyId = normalizePropertyId(config.propertyId);
  const token = await resolveAccessToken(config);

  const url = `${GA_API_BASE}/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: '180daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Error obteniendo historial mensual de GA');
  }

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const rows = (data.rows || []).map((r) => {
    const ym = r.dimensionValues?.[0]?.value || ''; // e.g. "202603"
    let monthLabel = ym;
    if (ym.length === 6) {
      const year = ym.slice(2, 4);
      const mIdx = parseInt(ym.slice(4, 6), 10) - 1;
      monthLabel = `${monthNames[mIdx] || ym.slice(4, 6)} ${year}`;
    }
    const sessions = parseInt(r.metricValues?.[0]?.value || 0, 10);
    const users = parseInt(r.metricValues?.[1]?.value || 0, 10);
    return {
      month: monthLabel,
      revenue: sessions, // en reportes BDAP, mapeamos a valor principal
      orders: users,
    };
  });

  return rows;
}
