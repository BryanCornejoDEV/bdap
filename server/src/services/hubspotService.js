/* eslint-env node */
/**
 * Servicio de integración con HubSpot CRM API (v3 REST)
 */

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

async function hubspotRequest(endpoint, accessToken, options = {}) {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || `Error de HubSpot HTTP ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.hubspotError = data;
    throw err;
  }

  return data;
}

/**
 * Prueba la conexión con HubSpot CRM verificando el access token.
 */
export async function testHubspotConnection(accessToken) {
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('HubSpot Access Token es requerido (Private App Token)');
  }

  const cleanToken = accessToken.trim();
  // Consulta de prueba de 1 contacto
  await hubspotRequest('/crm/v3/objects/contacts?limit=1', cleanToken);

  let ownerCount = 0;
  try {
    const owners = await hubspotRequest('/crm/v3/owners?limit=5', cleanToken);
    ownerCount = owners.results?.length || 0;
  } catch {
    // Si no tiene permiso de owners, los permisos de contacts bastaron
  }

  return {
    ok: true,
    message: 'Conexión exitosa con HubSpot CRM API',
    ownersAvailable: ownerCount > 0,
  };
}

/**
 * Obtiene contactos y leads reales desde HubSpot CRM.
 */
export async function fetchHubspotLeads(accessToken, { limit = 25 } = {}) {
  const cleanToken = accessToken.trim();

  // 1. Obtener propietarios para mapear ownerId a nombre
  const ownersMap = new Map();
  try {
    const ownersRes = await hubspotRequest('/crm/v3/owners?limit=100', cleanToken);
    for (const o of ownersRes.results || []) {
      const name = [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || o.id;
      ownersMap.set(o.id, name);
    }
  } catch {
    // Ignorar si no tiene permisos de lectura de owners
  }

  // 2. Obtener contactos
  const contactsRes = await hubspotRequest(
    `/crm/v3/objects/contacts?limit=${encodeURIComponent(limit)}&properties=firstname,lastname,email,company,lifecyclestage,hs_lead_status,hubspot_owner_id,createdate`,
    cleanToken
  );

  const results = contactsRes.results || [];

  const leads = results.map((c) => {
    const p = c.properties || {};
    const fullName = [p.firstname, p.lastname].filter(Boolean).join(' ') || p.company || p.email || `Contacto #${c.id}`;
    const rawStatus = p.hs_lead_status || p.lifecyclestage || 'OPEN';
    const status = rawStatus.toUpperCase().replace(/\s+/g, '_');
    const owner = p.hubspot_owner_id && ownersMap.has(p.hubspot_owner_id)
      ? ownersMap.get(p.hubspot_owner_id)
      : 'Equipo';

    return {
      id: c.id,
      name: fullName,
      email: p.email || '',
      company: p.company || '—',
      status,
      owner,
      createdAt: p.createdate || c.createdAt,
    };
  });

  return {
    source: 'live',
    configured: true,
    total: leads.length,
    leads,
  };
}
