/* eslint-env node */
/**
 * Servicio de integración con Stripe API (v1 REST)
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

async function stripeRequest(endpoint, apiKey, options = {}) {
  const url = `${STRIPE_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
    body: options.body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error?.message || `Error de Stripe HTTP ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.stripeError = data.error;
    throw err;
  }

  return data;
}

/**
 * Prueba la conexión con Stripe verificando la API Key.
 */
export async function testStripeConnection(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Stripe API Key es requerida');
  }

  const cleanKey = apiKey.trim();
  // Consulta de balance y cuenta para verificar permisos
  const balance = await stripeRequest('/balance', cleanKey);
  let accountInfo = null;
  try {
    const account = await stripeRequest('/account', cleanKey);
    accountInfo = {
      id: account.id,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || account.email || account.id,
      defaultCurrency: (account.default_currency || 'usd').toUpperCase(),
    };
  } catch {
    // Si la clave es de acceso restringido y no tiene permiso sobre /account, balance fue suficiente
    accountInfo = {
      id: 'stripe-account',
      businessName: 'Cuenta Conectada',
      defaultCurrency: 'USD',
    };
  }

  return {
    ok: true,
    message: `Conexión exitosa con Stripe (${accountInfo.businessName})`,
    account: accountInfo,
    livemode: balance.livemode ?? cleanKey.startsWith('sk_live_'),
  };
}

/**
 * Obtiene métricas de ingresos, MRR, ARR y transacciones recientes.
 */
export async function fetchStripeRevenue(apiKey, { currency = 'USD' } = {}) {
  const cleanKey = apiKey.trim();

  // 1. Balance actual
  const balance = await stripeRequest('/balance', cleanKey);

  // 2. Transacciones / Cargos recientes
  const charges = await stripeRequest('/charges?limit=100', cleanKey).catch(() => ({ data: [] }));

  // 3. Suscripciones activas para cálculo preciso de MRR
  const subscriptions = await stripeRequest('/subscriptions?status=active&limit=100', cleanKey).catch(() => ({ data: [] }));

  // Calcular total facturado a partir de cargos exitosos
  const successfulCharges = (charges.data || []).filter((c) => c.status === 'succeeded' && !c.refunded);
  const totalVolumeCents = successfulCharges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalVolume = Math.round(totalVolumeCents / 100);

  // Calcular MRR de suscripciones activas
  let calculatedMrrCents = 0;
  for (const sub of subscriptions.data || []) {
    for (const item of sub.items?.data || []) {
      const plan = item.price || item.plan;
      if (!plan) continue;
      const amount = (plan.unit_amount || plan.amount || 0) * (item.quantity || 1);
      const interval = plan.recurring?.interval || plan.interval || 'month';
      const intervalCount = plan.recurring?.interval_count || plan.interval_count || 1;

      if (interval === 'month') {
        calculatedMrrCents += amount / intervalCount;
      } else if (interval === 'year') {
        calculatedMrrCents += amount / (12 * intervalCount);
      } else if (interval === 'week') {
        calculatedMrrCents += (amount * 4.333) / intervalCount;
      } else if (interval === 'day') {
        calculatedMrrCents += (amount * 30.41) / intervalCount;
      }
    }
  }

  let mrr = Math.round(calculatedMrrCents / 100);

  // Si no hay suscripciones, calcular run-rate mensual a partir de cargos de los últimos 30 días
  if (mrr === 0 && successfulCharges.length > 0) {
    const thirtyDaysAgoSec = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    const last30DaysCharges = successfulCharges.filter((c) => c.created >= thirtyDaysAgoSec);
    const last30Volume = last30DaysCharges.reduce((acc, c) => acc + (c.amount || 0), 0) / 100;
    mrr = Math.round(last30Volume);
  }

  const arr = mrr * 12;

  // Balance disponible y pendiente
  const availableSum = (balance.available || []).reduce((acc, b) => acc + b.amount / 100, 0);
  const pendingSum = (balance.pending || []).reduce((acc, b) => acc + b.amount / 100, 0);

  // Últimas 5 transacciones resumidas
  const recentTransactions = successfulCharges.slice(0, 5).map((c) => ({
    id: c.id,
    amount: c.amount / 100,
    currency: (c.currency || currency).toUpperCase(),
    customer: c.billing_details?.name || c.receipt_email || c.customer || 'Cliente Stripe',
    status: c.status,
    date: new Date(c.created * 1000).toISOString(),
    description: c.description || 'Cargo Stripe',
  }));

  return {
    source: 'live',
    configured: true,
    currency: (balance.available?.[0]?.currency || currency).toUpperCase(),
    total: totalVolume > 0 ? totalVolume : Math.round(availableSum + pendingSum),
    mrr,
    arr,
    availableBalance: Math.round(availableSum),
    pendingBalance: Math.round(pendingSum),
    chargesCount: successfulCharges.length,
    recentTransactions,
  };
}

/**
 * Agrupa transacciones históricas de Stripe por mes (para sincronizar con reportes BDAP).
 */
export async function fetchStripeMonthlyBreakdown(apiKey) {
  const cleanKey = apiKey.trim();
  const charges = await stripeRequest('/charges?limit=100', cleanKey);
  const successful = (charges.data || []).filter((c) => c.status === 'succeeded' && !c.refunded);

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyMap = new Map();

  for (const c of successful) {
    const d = new Date(c.created * 1000);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { month: key, revenue: 0, orders: 0, sortKey: d.getTime() });
    }
    const cur = monthlyMap.get(key);
    cur.revenue += Math.round(c.amount / 100);
    cur.orders += 1;
  }

  const result = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
  return result.map(({ month, revenue, orders }) => ({ month, revenue, orders }));
}
