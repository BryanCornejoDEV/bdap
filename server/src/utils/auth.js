/* eslint-env node */
/* global process */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatoria en producción. Define la variable de entorno.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'bdap_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Resuelve el contexto de organización. El header x-org-id solo se acepta si el
// usuario realmente pertenece a esa organización (o es admin global); de lo
// contrario cualquier usuario autenticado podría leer datos de otras orgs.
export function withOrg(required = true) {
  return async (req, res, next) => {
    try {
      const headerOrg = req.headers['x-org-id'];
      const tokenOrg = req.user?.orgId;
      const orgId = headerOrg != null ? Number(headerOrg) : tokenOrg != null ? Number(tokenOrg) : null;

      if (orgId == null || Number.isNaN(orgId)) {
        if (required) return res.status(400).json({ error: 'Missing org context' });
        req.orgId = null;
        return next();
      }

      if (headerOrg != null && Number(headerOrg) !== Number(tokenOrg) && req.user.role !== 'admin') {
        const membership = await prisma.membership.findUnique({
          where: { userId_orgId: { userId: req.user.sub, orgId } },
        });
        if (!membership) return res.status(403).json({ error: 'Forbidden: no pertenece a la organización' });
      }

      req.orgId = orgId;
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Rate limiter en memoria (sin dependencias). Suficiente para una sola
// instancia; con múltiples instancias usar un store compartido (Redis).
export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Demasiados intentos, espera un momento' });
    }
    next();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
    }
  };
}
