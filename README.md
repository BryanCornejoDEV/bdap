# BDAP – Business Data Analyst Platform

Aplicación full-stack para KPIs, reportes, tablas y gráficos. Frontend React (Vite + Tailwind + React Query) y backend Express + Prisma con autenticación JWT real, multi-organización y control de roles.

## Stack

- **Frontend**: React 19, Vite, Tailwind, React Query v5, React Router v7, Recharts, axios
- **Backend**: Express, Prisma (SQLite en dev / Postgres recomendado en prod), JWT, bcrypt, zod
- **Exportación**: PDF (jsPDF), Excel (xlsx), CSV

## Puesta en marcha (desarrollo)

Requiere Node 18+.

```bash
# 1. Dependencias
npm install
cd server && npm install && cd ..

# 2. Base de datos (crea server/prisma/dev.db y datos de ejemplo)
npm run db:push
npm run db:seed

# 3. Backend en http://localhost:4000
npm run dev:server:watch

# 4. Frontend en http://localhost:5173 (proxy /api → :4000)
npm run dev
```

Credenciales de ejemplo:

- admin: `admin@bdap.local` / `admin123`
- analyst: `analyst@bdap.local` / `analyst123`

## Variables de entorno

### Backend (`server/.env`, ver `server/.env.example`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión Prisma. SQLite en dev; Postgres en producción. |
| `JWT_SECRET` | **Obligatoria en producción** — el servidor no arranca sin ella con `NODE_ENV=production`. |
| `JWT_EXPIRES_IN` | Duración del token (por defecto `7d`). |
| `PORT` | Puerto del API (por defecto `4000`). |
| `CORS_ORIGIN` | Orígenes permitidos en producción, separados por comas. |

### Frontend (`.env`, ver `.env.example`)

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base del API en producción. En dev no hace falta (se usa el proxy `/api`). |

## API

Todas las rutas (salvo login y health) requieren `Authorization: Bearer <token>`.

- `GET /api/health`
- `POST /api/auth/login` — con rate limit (10/min por IP)
- `GET /api/auth/me` · `POST /api/auth/logout` · `POST /api/auth/change-password` · `POST /api/auth/switch-org`
- `GET|POST /api/reports` · `GET|PUT|DELETE /api/reports/:id`
- `GET|POST /api/reports/:id/rows` · `DELETE /api/reports/:id/rows/:rowId`
- `GET|POST /api/users` · `PATCH|DELETE /api/users/:id` — solo admin
- `GET|POST /api/organizations` · `GET /api/organizations/:id` · miembros: `GET|POST /:id/members`, `DELETE /:id/members/:userId`
- `GET /api/integrations/*` — datos simulados (GA, Stripe, HubSpot)

Seguridad implementada: hash bcrypt, JWT firmado con expiración, validación zod en todos los inputs, aislamiento multi-tenant (el header `x-org-id` solo se acepta si el usuario pertenece a esa organización), roles admin/analyst, helmet, CORS restringible.

## Rutas del frontend

- `/` Dashboard · `/reports` y `/reports/:id` · `/integrations` · `/users` (solo admin) · `/profile` · `/settings` (cambio de password) · `/login`

## Despliegue en producción

1. **Base de datos**: usar Postgres (cambia `provider` a `"postgresql"` en `server/prisma/schema.prisma` y define `DATABASE_URL`). SQLite en hosting efímero (Render) pierde los datos en cada deploy.
2. **Backend**: `NODE_ENV=production`, `JWT_SECRET` fuerte y `CORS_ORIGIN` con el dominio del frontend. Arranque: `cd server && npm start`.
3. **Frontend**: `npm run build` genera `dist/`; define `VITE_API_BASE_URL` apuntando al API.
4. **Seed**: cambia las passwords de ejemplo tras el primer despliegue (desde `/settings` o `/users`).

## Scripts (raíz)

- `npm run dev` / `npm run build` / `npm run preview` / `npm run lint`
- `npm run dev:server` / `npm run dev:server:watch`
- `npm run db:push` / `npm run db:seed`
